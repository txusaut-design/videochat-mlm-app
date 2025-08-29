import { Router } from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest, requireActiveMembership } from '../middleware/auth';
import {
  validate,
  validateParams,
  validateQuery,
  createRoomSchema,
  updateRoomSchema,
  idParamSchema,
  paginationSchema
} from '../validators';

const router = Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/rooms
// @desc    Get all active rooms with pagination
// @access  Private
router.get('/', validateQuery(paginationSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { page, limit, sort, order } = req.query as any;
  const skip = (page - 1) * limit;

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where: { isActive: true },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          where: {
            leftAt: null // Only current members
          }
        },
        _count: {
          select: {
            members: {
              where: { leftAt: null }
            }
          }
        }
      },
      orderBy: { [sort]: order },
      skip,
      take: limit
    }),
    prisma.room.count({ where: { isActive: true } })
  ]);

  const totalPages = Math.ceil(total / limit);

  // Transform data to include current participant count
  const roomsWithParticipants = rooms.map(room => ({
    ...room,
    currentParticipants: room.members.map(member => member.user),
    participantCount: room._count.members,
    isFull: room._count.members >= room.maxParticipants
  }));

  res.json({
    success: true,
    data: {
      rooms: roomsWithParticipants,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

// @route   GET /api/rooms/:id
// @desc    Get room by ID with detailed info
// @access  Private
router.get('/:id', validateParams(idParamSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true,
              membershipExpiry: true
            }
          }
        },
        where: {
          leftAt: null // Only current members
        },
        orderBy: { joinedAt: 'asc' }
      }
    }
  });

  if (!room) {
    throw createError('Room not found', 404);
  }

  // Check if user is currently in the room
  const isUserInRoom = room.members.some(member => member.user.id === req.user!.id);

  res.json({
    success: true,
    data: {
      room: {
        ...room,
        currentParticipants: room.members.map(member => member.user),
        participantCount: room.members.length,
        isFull: room.members.length >= room.maxParticipants,
        isUserInRoom
      }
    }
  });
}));

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private (requires active membership)
router.post('/', requireActiveMembership, validate(createRoomSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { name, topic, description, maxParticipants, requiresMembership } = req.body;

  const room = await prisma.room.create({
    data: {
      name,
      topic,
      description,
      maxParticipants,
      requiresMembership,
      creatorId: req.user!.id
    },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Room created successfully',
    data: {
      room: {
        ...room,
        currentParticipants: [],
        participantCount: 0,
        isFull: false,
        isUserInRoom: false
      }
    }
  });
}));

// @route   PUT /api/rooms/:id
// @desc    Update room (only creator can update)
// @access  Private
router.put('/:id', validateParams(idParamSchema), validate(updateRoomSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  // Check if room exists and user is the creator
  const existingRoom = await prisma.room.findUnique({
    where: { id }
  });

  if (!existingRoom) {
    throw createError('Room not found', 404);
  }

  if (existingRoom.creatorId !== req.user!.id) {
    throw createError('Only room creator can update the room', 403);
  }

  const room = await prisma.room.update({
    where: { id },
    data: req.body,
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        where: { leftAt: null }
      }
    }
  });

  res.json({
    success: true,
    message: 'Room updated successfully',
    data: {
      room: {
        ...room,
        currentParticipants: room.members.map(member => member.user),
        participantCount: room.members.length,
        isFull: room.members.length >= room.maxParticipants
      }
    }
  });
}));

// @route   POST /api/rooms/:id/join
// @desc    Join a room
// @access  Private
router.post('/:id/join', validateParams(idParamSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id: roomId } = req.params;
  const userId = req.user!.id;

  // Get room with current members
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        where: { leftAt: null }
      }
    }
  });

  if (!room) {
    throw createError('Room not found', 404);
  }

  if (!room.isActive) {
    throw createError('Room is not active', 400);
  }

  // Check if room requires membership
  if (room.requiresMembership) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { membershipExpiry: true }
    });

    const hasActiveMembership = user?.membershipExpiry && new Date(user.membershipExpiry) > new Date();
    if (!hasActiveMembership) {
      throw createError('Active membership required to join this room', 403);
    }
  }

  // Check if room is full
  if (room.members.length >= room.maxParticipants) {
    throw createError('Room is full', 400);
  }

  // Check if user is already in the room
  const existingMember = await prisma.roomMember.findFirst({
    where: {
      roomId,
      userId,
      leftAt: null
    }
  });

  if (existingMember) {
    throw createError('User is already in the room', 400);
  }

  // Add user to room
  await prisma.roomMember.create({
    data: {
      roomId,
      userId
    }
  });

  // Get updated room info
  const updatedRoom = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        where: { leftAt: null }
      }
    }
  });

  res.json({
    success: true,
    message: 'Successfully joined the room',
    data: {
      room: {
        ...updatedRoom,
        currentParticipants: updatedRoom!.members.map(member => member.user),
        participantCount: updatedRoom!.members.length,
        isFull: updatedRoom!.members.length >= updatedRoom!.maxParticipants,
        isUserInRoom: true
      }
    }
  });
}));

// @route   POST /api/rooms/:id/leave
// @desc    Leave a room
// @access  Private
router.post('/:id/leave', validateParams(idParamSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id: roomId } = req.params;
  const userId = req.user!.id;

  // Find active membership in room
  const membership = await prisma.roomMember.findFirst({
    where: {
      roomId,
      userId,
      leftAt: null
    }
  });

  if (!membership) {
    throw createError('User is not in this room', 400);
  }

  // Mark user as left
  await prisma.roomMember.update({
    where: { id: membership.id },
    data: { leftAt: new Date() }
  });

  res.json({
    success: true,
    message: 'Successfully left the room'
  });
}));

// @route   DELETE /api/rooms/:id
// @desc    Delete room (only creator can delete)
// @access  Private
router.delete('/:id', validateParams(idParamSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { id } = req.params;

  // Check if room exists and user is the creator
  const room = await prisma.room.findUnique({
    where: { id }
  });

  if (!room) {
    throw createError('Room not found', 404);
  }

  if (room.creatorId !== req.user!.id) {
    throw createError('Only room creator can delete the room', 403);
  }

  // Soft delete - mark as inactive
  await prisma.room.update({
    where: { id },
    data: { isActive: false }
  });

  // Mark all current members as left
  await prisma.roomMember.updateMany({
    where: {
      roomId: id,
      leftAt: null
    },
    data: { leftAt: new Date() }
  });

  res.json({
    success: true,
    message: 'Room deleted successfully'
  });
}));

// @route   GET /api/rooms/my/created
// @desc    Get rooms created by current user
// @access  Private
router.get('/my/created', validateQuery(paginationSchema), asyncHandler(async (req: AuthRequest, res: any) => {
  const { page, limit, sort, order } = req.query as any;
  const skip = (page - 1) * limit;

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where: { creatorId: req.user!.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          where: { leftAt: null }
        },
        _count: {
          select: {
            members: {
              where: { leftAt: null }
            }
          }
        }
      },
      orderBy: { [sort]: order },
      skip,
      take: limit
    }),
    prisma.room.count({ where: { creatorId: req.user!.id } })
  ]);

  const totalPages = Math.ceil(total / limit);

  const roomsWithParticipants = rooms.map(room => ({
    ...room,
    currentParticipants: room.members.map(member => member.user),
    participantCount: room._count.members,
    isFull: room._count.members >= room.maxParticipants
  }));

  res.json({
    success: true,
    data: {
      rooms: roomsWithParticipants,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
}));

export default router;
