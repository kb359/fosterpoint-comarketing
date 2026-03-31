import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      return Response.json(
        { error: "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return Response.json({ message: "Admin user already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        name: "Admin",
      },
    });

    return Response.json(
      { message: "Admin user created", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to seed admin user:", error);
    return Response.json({ error: "Failed to seed admin user" }, { status: 500 });
  }
}
