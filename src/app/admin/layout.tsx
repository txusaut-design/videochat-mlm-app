export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      {children}
    </div>
  );
}

export const metadata = {
  title: 'Panel de Administración - VideoChat MLM',
  description: 'Dashboard administrativo para gestionar usuarios, salas y moderación',
};
