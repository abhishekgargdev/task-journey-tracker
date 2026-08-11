import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSession } from "@/lib/session";

// Retrieve list of all users in system
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const users = await User.find({}, "name email createdAt").sort({ name: 1 });
    return NextResponse.json(users);
  } catch (error) {
    console.error("GET users error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Provision a new developer account
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, password } = await request.json();

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!password || password.trim().length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    await dbConnect();

    // Check duplicate email
    const duplicate = await User.findOne({ email: email.trim().toLowerCase() });
    if (duplicate) {
      return NextResponse.json({ error: "Email is already registered to another developer." }, { status: 400 });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const newUser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    });

    return NextResponse.json(
      {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST user creation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
