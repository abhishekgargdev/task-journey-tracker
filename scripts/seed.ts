import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

async function main() {
  console.log("=========================================");
  console.log("WARNING: Starting Database Seeding...");
  console.log("This will clear all existing data!");
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
  const { Sprint } = await import("../src/models/Sprint");
  const { Task } = await import("../src/models/Task");
  const { UserStory } = await import("../src/models/UserStory");
  const { StoryStage } = await import("../src/models/StoryStage");

  await dbConnect();
  console.log("Connected to MongoDB successfully.");

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    StageDefinition.deleteMany({}),
    Sprint.deleteMany({}),
    Task.deleteMany({}),
    UserStory.deleteMany({}),
    StoryStage.deleteMany({}),
  ]);
  console.log("Cleared all existing database collections.");

  // Seed Users
  const seedEmail = process.env.SEED_EMAIL || "you@bajajfinserv.local";
  const seedPassword = process.env.SEED_PASSWORD || "Test@123";
  const hashedSeedPassword = await bcrypt.hash(seedPassword, 10);

  const mainUser = await User.create({
    name: "Your Name",
    email: seedEmail,
    passwordHash: hashedSeedPassword,
  });

  const secondaryUser1 = await User.create({
    name: "Alex Rivera",
    email: "alex.r@company.com",
    passwordHash: await bcrypt.hash("user123", 10),
  });

  const secondaryUser2 = await User.create({
    name: "Sarah Jenkins",
    email: "sarah.j@company.com",
    passwordHash: await bcrypt.hash("user123", 10),
  });

  console.log(`Seeded 3 users. Main login: ${seedEmail} / ${seedPassword}`);

  // Seed Stage Definitions (9 stages)
  const stageNames = [
    { name: "Partner Discussion", colorTag: "slate" },
    { name: "Development", colorTag: "indigo" },
    { name: "Test Scenarios", colorTag: "blue" },
    { name: "IT UAT", colorTag: "violet" },
    { name: "Biz UAT", colorTag: "cyan" },
    { name: "N2P Patch Development", colorTag: "orange" },
    { name: "N2P Testing", colorTag: "amber" },
    { name: "Production Patch", colorTag: "rose" },
    { name: "Go Live", colorTag: "emerald" },
  ];

  const stageDocs: any[] = [];
  for (let i = 0; i < stageNames.length; i++) {
    const s = stageNames[i];
    const doc = await StageDefinition.create({
      name: s.name,
      colorTag: s.colorTag,
      isActive: true,
      defaultOrder: i + 1,
      createdBy: mainUser._id,
    });
    stageDocs.push(doc);
  }
  console.log(`Seeded ${stageDocs.length} pipeline catalog stages.`);

  // Seed Sprint
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  const activeSprint = await Sprint.create({
    name: "Sprint 1 - Core Flow Integration",
    startDate: twoWeeksAgo,
    endDate: oneWeekFromNow,
    status: "active",
  });
  console.log(`Seeded active Sprint: "${activeSprint.name}"`);

  // Seed Tasks
  const task1 = await Task.create({
    title: "Configure Custom Pipelines API",
    description: "Build Mongoose schemas and REST API endpoints for dynamic stage catalogs and sequences.",
    adoTaskLink: "https://dev.azure.com/bajaj/tjt/_workitems/edit/12450",
    owner: mainUser._id,
  });

  const task2 = await Task.create({
    title: "Deliver Drag and Drop Dashboard UI",
    description: "Implement Sortable dnd-kit stages editor screen featuring micro-animations.",
    adoTaskLink: "https://dev.azure.com/bajaj/tjt/_workitems/edit/12451",
    owner: secondaryUser1._id,
  });
  console.log("Seeded 2 sample Tasks.");

  // Helper to create planned/actual dates realistically
  const getDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  // Seed User Stories (5 stories)
  // Story 1: Uses all 9 stages, currentStageOrder = 3 (Test Scenarios)
  const planAll9 = stageDocs.map((doc, idx) => ({ stage: doc._id as mongoose.Types.ObjectId, order: idx + 1 }));
  
  const story1 = await UserStory.create({
    title: "Deploy Multi-Region Compliance Rules",
    adoStoryLink: "https://dev.azure.com/bajaj/tjt/_workitems/edit/55101",
    task: task1._id,
    sprint: activeSprint._id,
    stagePlan: planAll9,
    currentStageOrder: 3,
    overallStatus: "in_progress",
  });

  // Story Stages for Story 1
  for (const step of planAll9) {
    let status: "completed" | "in_progress" | "not_started" = "not_started";
    let actualStart, actualEnd;
    if (step.order < 3) {
      status = "completed";
      actualStart = getDateOffset(-10 + step.order * 2);
      actualEnd = getDateOffset(-9 + step.order * 2);
    } else if (step.order === 3) {
      status = "in_progress";
      actualStart = getDateOffset(-4);
    }

    await StoryStage.create({
      story: story1._id,
      stage: step.stage,
      order: step.order,
      plannedStartDate: getDateOffset(-12 + step.order * 2),
      plannedEndDate: getDateOffset(-10 + step.order * 2),
      actualStartDate: actualStart,
      actualEndDate: actualEnd,
      status,
      githubRepo: step.order === 2 ? "bajaj-finserv/pipeline-rules" : undefined,
      branchName: step.order === 2 ? "feature/compliance-rules" : undefined,
      assignedTo: step.order % 2 === 0 ? secondaryUser1._id : mainUser._id,
      notes: step.order === 3 ? "Active verification of mock criteria matches." : undefined,
    });
  }

  // Story 2: Uses all 9 stages, currentStageOrder = 8 (Production Patch)
  const story2 = await UserStory.create({
    title: "Enable Tokenized Multi-Factor Gateways",
    adoStoryLink: "https://dev.azure.com/bajaj/tjt/_workitems/edit/55102",
    task: task1._id,
    sprint: activeSprint._id,
    stagePlan: planAll9,
    currentStageOrder: 8,
    overallStatus: "in_progress",
  });

  for (const step of planAll9) {
    let status: "completed" | "in_progress" | "not_started" = "not_started";
    let actualStart, actualEnd;
    if (step.order < 8) {
      status = "completed";
      actualStart = getDateOffset(-12 + step.order);
      actualEnd = getDateOffset(-11 + step.order);
    } else if (step.order === 8) {
      status = "in_progress";
      actualStart = getDateOffset(-2);
    }

    await StoryStage.create({
      story: story2._id,
      stage: step.stage,
      order: step.order,
      plannedStartDate: getDateOffset(-14 + step.order),
      plannedEndDate: getDateOffset(-13 + step.order),
      actualStartDate: actualStart,
      actualEndDate: actualEnd,
      status,
      assignedTo: step.order === 8 ? secondaryUser2._id : secondaryUser1._id,
      notes: step.order === 8 ? "Applying dry run scripts on replica sandbox." : undefined,
    });
  }

  // Story 3: Uses 6 stages (skips stage 6 and 7: N2P Patch Dev and N2P Testing)
  // Stage index mapping: 0, 1, 2, 3, 4, 8 (Partner Discussion, Dev, Test Scenarios, IT UAT, Biz UAT, Go Live)
  const chosen6Indices = [0, 1, 2, 3, 4, 8];
  const plan6 = chosen6Indices.map((idx, orderIdx) => ({
    stage: stageDocs[idx]._id as mongoose.Types.ObjectId,
    order: orderIdx + 1,
  }));

  const story3 = await UserStory.create({
    title: "Refactor Vault Credentials Auditing",
    adoStoryLink: "https://dev.azure.com/bajaj/tjt/_workitems/edit/55103",
    task: task2._id,
    sprint: activeSprint._id,
    stagePlan: plan6,
    currentStageOrder: 2,
    overallStatus: "in_progress",
  });

  for (const step of plan6) {
    let status: "completed" | "in_progress" | "not_started" = "not_started";
    let actualStart, actualEnd;
    if (step.order < 2) {
      status = "completed";
      actualStart = getDateOffset(-6);
      actualEnd = getDateOffset(-5);
    } else if (step.order === 2) {
      status = "in_progress";
      actualStart = getDateOffset(-4);
    }

    await StoryStage.create({
      story: story3._id,
      stage: step.stage,
      order: step.order,
      plannedStartDate: getDateOffset(-7 + step.order * 2),
      plannedEndDate: getDateOffset(-5 + step.order * 2),
      actualStartDate: actualStart,
      actualEndDate: actualEnd,
      status,
      githubRepo: step.order === 2 ? "bajaj-finserv/vault-auditor" : undefined,
      branchName: step.order === 2 ? "refactor/vault-audit" : undefined,
      assignedTo: mainUser._id,
    });
  }

  // Story 4: Uses 6 stages (skips 6 and 7), currentStageOrder = 6 (Go Live)
  const story4 = await UserStory.create({
    title: "Implement Batch Transaction Webhooks",
    adoStoryLink: "https://dev.azure.com/bajaj/tjt/_workitems/edit/55104",
    task: task2._id,
    sprint: activeSprint._id,
    stagePlan: plan6,
    currentStageOrder: 6,
    overallStatus: "in_progress",
  });

  for (const step of plan6) {
    let status: "completed" | "in_progress" | "not_started" = "not_started";
    let actualStart, actualEnd;
    if (step.order < 6) {
      status = "completed";
      actualStart = getDateOffset(-8 + step.order);
      actualEnd = getDateOffset(-7 + step.order);
    } else if (step.order === 6) {
      status = "in_progress";
      actualStart = getDateOffset(-1);
    }

    await StoryStage.create({
      story: story4._id,
      stage: step.stage,
      order: step.order,
      plannedStartDate: getDateOffset(-9 + step.order),
      plannedEndDate: getDateOffset(-8 + step.order),
      actualStartDate: actualStart,
      actualEndDate: actualEnd,
      status,
      assignedTo: secondaryUser2._id,
    });
  }

  // Story 5: Uses just 4 stages (Partner Discussion, Development, IT UAT, Go Live)
  // Stage index mapping: 0, 1, 3, 8
  const chosen4Indices = [0, 1, 3, 8];
  const plan4 = chosen4Indices.map((idx, orderIdx) => ({
    stage: stageDocs[idx]._id as mongoose.Types.ObjectId,
    order: orderIdx + 1,
  }));

  const story5 = await UserStory.create({
    title: "Fast-track Security Signature Validation",
    adoStoryLink: "https://dev.azure.com/bajaj/tjt/_workitems/edit/55105",
    task: task2._id,
    sprint: activeSprint._id,
    stagePlan: plan4,
    currentStageOrder: 1,
    overallStatus: "in_progress",
  });

  for (const step of plan4) {
    let status: "completed" | "in_progress" | "not_started" = "not_started";
    let actualStart;
    if (step.order === 1) {
      status = "in_progress";
      actualStart = getDateOffset(-2);
    }

    await StoryStage.create({
      story: story5._id,
      stage: step.stage,
      order: step.order,
      plannedStartDate: getDateOffset(-3 + step.order * 2),
      plannedEndDate: getDateOffset(-1 + step.order * 2),
      actualStartDate: actualStart,
      status,
      assignedTo: mainUser._id,
    });
  }

  console.log("Seeded 5 dynamic UserStories with mapped StoryStages.");
  console.log("=========================================");
  console.log("DATABASE SEED COMPLETED SUCCESSFULLY!");
  console.log(`- Seeded Users: ${await User.countDocuments()}`);
  console.log(`- Seeded StageDefinitions: ${await StageDefinition.countDocuments()}`);
  console.log(`- Seeded Sprints: ${await Sprint.countDocuments()}`);
  console.log(`- Seeded Tasks: ${await Task.countDocuments()}`);
  console.log(`- Seeded UserStories: ${await UserStory.countDocuments()}`);
  console.log(`- Seeded StoryStages: ${await StoryStage.countDocuments()}`);
  console.log("=========================================");
  console.log("LOGIN CREDENTIALS:");
  console.log(`Email:    ${seedEmail}`);
  console.log(`Password: ${seedPassword}`);
  console.log("=========================================");

  mongoose.connection.close();
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  mongoose.connection.close();
});
