import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { DailyStatusReport } from "@/models/DailyStatusReport";
import { getSession } from "@/lib/session";

// Aggregate mood and metrics for the logged-in developer
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch up to last 30 reports for trend charts
    const reports = await DailyStatusReport.find({ owner: session.userId })
      .sort({ date: 1 })
      .limit(30);

    const moodDistribution = {
      productive: 0,
      average: 0,
      blocked: 0,
      exhausted: 0,
    };

    let totalHours = 0;
    let blockerDaysCount = 0;

    const trendData = reports.map((r) => {
      moodDistribution[r.mood] = (moodDistribution[r.mood] || 0) + 1;
      totalHours += r.hoursSpent || 0;
      if (r.blockers && r.blockers.trim().length > 0) {
        blockerDaysCount++;
      }

      // Convert mood enum to numeric scale for charting
      let moodScore = 3;
      if (r.mood === "productive") moodScore = 4;
      else if (r.mood === "average") moodScore = 3;
      else if (r.mood === "blocked") moodScore = 2;
      else if (r.mood === "exhausted") moodScore = 1;

      return {
        date: r.date.toISOString().split("T")[0],
        hoursSpent: r.hoursSpent || 0,
        moodScore,
        moodLabel: r.mood,
        linkedTasksCount: r.linkedTasks?.length || 0,
      };
    });

    // Calculate contribution/standup streaks
    const allReports = await DailyStatusReport.find({ owner: session.userId })
      .sort({ date: -1 }) // newest first
      .select("date");

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (allReports.length > 0) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let expectedDate = new Date(allReports[0].date);
      expectedDate.setUTCHours(0, 0, 0, 0);

      const diffTime = Math.abs(today.getTime() - expectedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Current streak continues if they logged today or yesterday
      if (diffDays <= 1) {
        currentStreak = 1;
        tempStreak = 1;

        for (let i = 1; i < allReports.length; i++) {
          const prevDate = new Date(allReports[i].date);
          prevDate.setUTCHours(0, 0, 0, 0);

          const nextExpected = new Date(expectedDate);
          nextExpected.setDate(nextExpected.getDate() - 1);

          if (prevDate.getTime() === nextExpected.getTime()) {
            tempStreak++;
            expectedDate = prevDate;
          } else if (prevDate.getTime() < nextExpected.getTime()) {
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak;
            }
            if (i === tempStreak) {
              currentStreak = tempStreak;
            }
            tempStreak = 1;
            expectedDate = prevDate;
          }
        }
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        // Gap is too large to maintain current streak
        currentStreak = 0;

        // Still calculate longest historical streak
        tempStreak = 1;
        for (let i = 1; i < allReports.length; i++) {
          const prevDate = new Date(allReports[i].date);
          prevDate.setUTCHours(0, 0, 0, 0);

          const nextExpected = new Date(expectedDate);
          nextExpected.setDate(nextExpected.getDate() - 1);

          if (prevDate.getTime() === nextExpected.getTime()) {
            tempStreak++;
            expectedDate = prevDate;
          } else {
            if (tempStreak > longestStreak) {
              longestStreak = tempStreak;
            }
            tempStreak = 1;
            expectedDate = prevDate;
          }
        }
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      }
    }

    if (longestStreak === 0 && currentStreak > 0) {
      longestStreak = currentStreak;
    }

    return NextResponse.json({
      moodDistribution,
      trendData,
      summary: {
        totalReports: allReports.length,
        totalHours,
        averageHours: allReports.length > 0 ? Number((totalHours / allReports.length).toFixed(1)) : 0,
        blockerDaysCount,
        currentStreak,
        longestStreak,
      },
    });
  } catch (error) {
    console.error("GET daily-status analytics error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
