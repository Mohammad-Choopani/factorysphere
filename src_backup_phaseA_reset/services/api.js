const users = [
  { email: "plant@factory.com", password: "123456", role: "PlantManager" },
  { email: "production@factory.com", password: "123456", role: "ProductionManager" },
  { email: "supervisor@factory.com", password: "123456", role: "Supervisor" },
  { email: "quality@factory.com", password: "123456", role: "Quality" },
  { email: "maintenance@factory.com", password: "123456", role: "Maintenance" },
  { email: "team@factory.com", password: "123456", role: "TeamLeader" },
];

export function loginUser(email, password) {
  const user = users.find(
    (u) => u.email === email && u.password === password
  );
  if (user) return { success: true, role: user.role };
  return { success: false };
}