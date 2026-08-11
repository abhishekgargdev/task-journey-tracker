import fs from "fs";
import path from "path";
import mongoose from "mongoose";

async function main() {
  console.log("=========================================");
  console.log("Starting Database Migration...");
  console.log("Converting UserStory data to new Story model...");
  console.log("=========================================");

  // Load env variables synchronously before importing database client
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const index = trimmed.indexOf("=");
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, "");
          process.env[key] = val;
        }
      }
    });
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Error: MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  // Dynamically import Mongoose models to prevent static import hoisting
  const { default: dbConnect } = await import("../src/lib/mongodb");
  const { User } = await import("../src/models/User");
  const { StageDefinition } = await import("../src/models/StageDefinition");
  const { Story } = await import("../src/models/Story");
  const { StoryUser } = await import("../src/models/StoryUser");
  const { StoryStage } = await import("../src/models/StoryStage");

  await dbConnect();
  console.log("Connected to MongoDB successfully.");

  if (!mongoose.connection.db) {
    throw new Error("MongoDB connection database is undefined.");
  }

  // Check if legacy UserStory collection exists
  const collections = await mongoose.connection.db.listCollections().toArray();
  const hasLegacyCollection = collections.some((c) => c.name === "userstories");

  if (!hasLegacyCollection) {
    console.log("No legacy 'userstories' collection found. Nothing to migrate.");
    mongoose.connection.close();
    return;
  }

  const legacyStories = await mongoose.connection.db.collection("userstories").find({}).toArray();
  console.log(`Found ${legacyStories.length} legacy user stories.`);

  let migratedCount = 0;
  for (let idx = 0; idx < legacyStories.length; idx++) {
    const legacy = legacyStories[idx];
    
    // Check if already migrated
    const alreadyMigrated = await Story.exists({ _id: legacy._id });
    if (alreadyMigrated) {
      console.log(`Story ${legacy.title} already migrated.`);
      continue;
    }

    // Try to extract story number from title or use a default index
    let storyNumber = `ST-${1000 + idx}`;
    const numMatch = legacy.title.match(/#(\d+)/);
    if (numMatch && numMatch[1]) {
      storyNumber = numMatch[1];
    } else {
      // Check if title starts with digits
      const digitMatch = legacy.title.match(/^(\d+)/);
      if (digitMatch && digitMatch[1]) {
        storyNumber = digitMatch[1];
      }
    }

    // Map stages from stagePlan
    const stageOrderIds = (legacy.stagePlan || []).map((sp: any) => sp.stage);

    // Create Main Story
    const newStory = await Story.create({
      _id: legacy._id,
      storyNumber,
      taskName: legacy.title.replace(/#\d+\s*-\s*|^\d+\s*-\s*/, ""), // Strip number prefix if present
      description: legacy.description || "",
      plannedStartDate: legacy.plannedStartDate || new Date(),
      plannedEndDate: legacy.plannedEndDate || new Date(),
      actualStartDate: legacy.actualStartDate,
      actualEndDate: legacy.actualEndDate,
      status: legacy.overallStatus || "not_started",
      stageOrder: stageOrderIds,
    });

    // Create StoryUser assignments
    if (legacy.assignedTo) {
      await StoryUser.create({
        storyId: newStory._id,
        userId: legacy.assignedTo,
      });
    }

    // Update child stages in StoryStage
    const legacyStages = await mongoose.connection.db.collection("storystages").find({ story: legacy._id }).toArray();
    for (const legacyStage of legacyStages) {
      // Check if StageDefinition exists for this stageId
      const stageDef = await StageDefinition.findById(legacyStage.stage);
      const stageName = stageDef ? stageDef.name : "Stage";

      // If user assigned to child story is different, also add to StoryUsers to maintain safety validation
      if (legacyStage.assignedTo && legacyStage.assignedTo.toString() !== legacy.assignedTo?.toString()) {
        const userExistsInStory = await StoryUser.exists({ storyId: newStory._id, userId: legacyStage.assignedTo });
        if (!userExistsInStory) {
          await StoryUser.create({
            storyId: newStory._id,
            userId: legacyStage.assignedTo,
          });
        }
      }

      await StoryStage.updateOne(
        { _id: legacyStage._id },
        {
          $set: {
            storyId: newStory._id,
            stageId: legacyStage.stage,
            stageOrder: legacyStage.order,
            taskName: `#${storyNumber}-${stageName}`,
            developBy: legacyStage.assignedTo,
            githubPrLink: legacyStage.prLink || "",
            status: legacyStage.status || "not_started",
          },
          $unset: {
            story: "",
            stage: "",
            order: "",
            assignedTo: "",
            prLink: "",
          },
        }
      );
    }

    migratedCount++;
  }

  console.log(`Successfully migrated ${migratedCount} stories and their child stages.`);
  console.log("=========================================");
  mongoose.connection.close();
}

main().catch((err) => {
  console.error("Migration script failed:", err);
  mongoose.connection.close();
});
