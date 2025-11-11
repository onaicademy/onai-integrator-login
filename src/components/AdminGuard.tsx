export function AdminGuard({ children }: { children: React.ReactNode }) {
  console.log('✅ AdminGuard: ОТКЛЮЧЕН, пропускаем всех');
  return <>{children}</>;
}
