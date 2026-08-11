import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSession, createSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(session.userId, "name email");
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET profile error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, password } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    await dbConnect();

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: session.userId } });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already in use by another account." }, { status: 400 });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    user.name = name.trim();
    user.email = email.trim().toLowerCase();

    if (password && password.trim().length >= 6) {
      user.passwordHash = await bcrypt.hash(password, 10);
    } else if (password && password.trim().length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    await user.save();

    // Regenerate session cookie
    const token = await createSession({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
      },
    });

    // Set updated session cookie
    response.cookies.set({
      name: "tjt_session",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("PATCH profile error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
