import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:5000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const res = NextResponse.json(
      {
        success: true,
        data: data.data || data,
        message: "Login successful (BFF Token secured)",
      },
      { status: 200 }
    );

    // Extract token from backend response
    const token = data.data?.token || data.token;

    if (token) {
      // Store JWT in secure HTTP-Only cookie to prevent XSS theft
      res.cookies.set({
        name: "knome_token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "BFF Login Service Error" },
      { status: 500 }
    );
  }
}
