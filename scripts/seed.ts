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
  const { Story } = await import("../src/models/Story");
  const { StoryUser } = await import("../src/models/StoryUser");
  const { StoryStage } = await import("../src/models/StoryStage");

  await dbConnect();
  console.log("Connected to MongoDB successfully.");

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    StageDefinition.deleteMany({}),
    Story.deleteMany({}),
    StoryUser.deleteMany({}),
    StoryStage.deleteMany({}),
  ]);
  console.log("Cleared all existing database collections.");

  // Drop old indexes to prevent E11000 duplicate key error from legacy schema index
  try {
    await StoryStage.collection.dropIndexes();
    console.log("Dropped legacy indexes on StoryStage collection.");
  } catch (err) {
    // Ignore error if indexes don't exist
  }

  // Seed Users with status
  const seedEmail = process.env.SEED_EMAIL || "abhishekgargdev959@gmail.com";
  const seedPassword = process.env.SEED_PASSWORD || "Test@1234";
  const hashedSeedPassword = await bcrypt.hash(seedPassword, 10);

  const mainUser = await User.create({
    name: "Your Name",
    email: seedEmail,
    passwordHash: hashedSeedPassword,
    status: "active",
  });

  const secondaryUser1 = await User.create({
    name: "Alex Rivera",
    email: "alex.r@company.com",
    passwordHash: await bcrypt.hash("user123", 10),
    status: "active",
  });

  const secondaryUser2 = await User.create({
    name: "Sarah Jenkins",
    email: "sarah.j@company.com",
    passwordHash: await bcrypt.hash("user123", 10),
    status: "active",
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

  // Helper to create planned/actual dates realistically
  const getDateOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

  const allStageIds = stageDocs.map((d) => d._id);

  // Story 1: Multi-Region Compliance
  const story1 = await Story.create({
    storyNumber: "55101",
    taskName: "Deploy Multi-Region Compliance Rules",
    description: "Ensure multi-region database queries adhere to international privacy compliance rules.",
    plannedStartDate: getDateOffset(-12),
    plannedEndDate: getDateOffset(6),
    status: "in_progress",
    stageOrder: allStageIds,
  });

  // Story 1 User Assignments
  await StoryUser.create({ storyId: story1._id, userId: mainUser._id });
  await StoryUser.create({ storyId: story1._id, userId: secondaryUser1._id });

  // Story 1 Child Stages
  for (let i = 0; i < stageDocs.length; i++) {
    const stage = stageDocs[i];
    const order = i + 1;
    let status: "completed" | "in_progress" | "not_started" = "not_started";
    let actualStart, actualEnd;
    if (order < 3) {
      status = "completed";
      actualStart = getDateOffset(-10 + order * 2);
      actualEnd = getDateOffset(-9 + order * 2);
    } else if (order === 3) {
      status = "in_progress";
      actualStart = getDateOffset(-4);
    }

    await StoryStage.create({
      storyId: story1._id,
      stageId: stage._id,
      stageOrder: order,
      taskName: `#55101-${stage.name}`,
      description: `VerifyCompliance for ${stage.name}.`,
      plannedStartDate: getDateOffset(-12 + order * 2),
      plannedEndDate: getDateOffset(-10 + order * 2),
      actualStartDate: actualStart,
      actualEndDate: actualEnd,
      developBy: order % 2 === 0 ? secondaryUser1._id : mainUser._id,
      githubPrLink: order < 3 ? "https://github.com/org/repo/pull/" + (100 + order) : (order === 3 ? "https://github.com/org/repo/pull/103" : undefined),
      branchName: order <= 3 ? `feature/compliance-rules-stage-${order}` : undefined,
      status,
      githubRepo: order <= 3 ? "org/repo" : undefined,
      prStatus: status === "completed" ? "merged" : status === "in_progress" ? "pending" : "none",
      implementationDescription: `Executed setup for Stage ${order}.`,
      notes: order === 3 ? "Active verification of mock criteria matches." : undefined,
      adoStoryLink: `https://dev.azure.com/work/55101#${order}`,
    });
  }

  // Story 2: Tokenized MFA (Delayed/At Risk)
  const story2 = await Story.create({
    storyNumber: "55102",
    taskName: "Enable Tokenized Multi-Factor Gateways",
    description: "Provide robust multi-factor token authentication gateways for high-security transactions.",
    plannedStartDate: getDateOffset(-14),
    plannedEndDate: getDateOffset(-1), // Past planned end date
    status: "delayed",
    stageOrder: allStageIds,
  });

  // Story 2 User Assignments
  await StoryUser.create({ storyId: story2._id, userId: secondaryUser1._id });
  await StoryUser.create({ storyId: story2._id, userId: secondaryUser2._id });

  for (let i = 0; i < stageDocs.length; i++) {
    const stage = stageDocs[i];
    const order = i + 1;
    let status: "completed" | "in_progress" | "not_started" | "delayed" = "not_started";
    let actualStart, actualEnd;
    if (order < 8) {
      status = "completed";
      actualStart = getDateOffset(-12 + order);
      actualEnd = getDateOffset(-11 + order);
    } else if (order === 8) {
      status = "delayed"; // Delayed stage
      actualStart = getDateOffset(-2);
    }

    await StoryStage.create({
      storyId: story2._id,
      stageId: stage._id,
      stageOrder: order,
      taskName: `#55102-${stage.name}`,
      description: `Integrate MFA for ${stage.name}.`,
      plannedStartDate: getDateOffset(-14 + order),
      plannedEndDate: getDateOffset(-13 + order), // All stages planned dates are in the past
      actualStartDate: actualStart,
      actualEndDate: actualEnd,
      developBy: order === 8 ? secondaryUser2._id : secondaryUser1._id,
      githubPrLink: order < 8 ? "https://github.com/org/repo/pull/" + (200 + order) : (order === 8 ? "https://github.com/org/repo/pull/208" : undefined),
      branchName: order <= 8 ? `feature/mfa-gateway-stage-${order}` : undefined,
      status,
      githubRepo: order <= 8 ? "org/repo" : undefined,
      prStatus: status === "completed" ? "merged" : status === "delayed" ? "pending" : "none",
      implementationDescription: `MFA stage ${order} implementation.`,
      adoStoryLink: `https://dev.azure.com/work/55102#${order}`,
    });
  }

  // Story 3: Vault Auditing (Uses 6 stages)
  const chosen6Stages = [0, 1, 2, 3, 4, 8].map(idx => stageDocs[idx]._id);
  const story3 = await Story.create({
    storyNumber: "55103",
    taskName: "Refactor Vault Credentials Auditing",
    description: "Clean up and rebuild credentials audit pipelines for secure hashicorp vault storage.",
    plannedStartDate: getDateOffset(-6),
    plannedEndDate: getDateOffset(6),
    status: "in_progress",
    stageOrder: chosen6Stages,
  });

  // Story 3 User Assignments
  await StoryUser.create({ storyId: story3._id, userId: mainUser._id });
  await StoryUser.create({ storyId: story3._id, userId: secondaryUser2._id });

  for (let i = 0; i < chosen6Stages.length; i++) {
    const stage = stageDocs[ [0, 1, 2, 3, 4, 8][i] ];
    const order = i + 1;
    let status: "completed" | "in_progress" | "not_started" = "not_started";
    let actualStart, actualEnd;
    if (order < 2) {
      status = "completed";
      actualStart = getDateOffset(-6);
      actualEnd = getDateOffset(-5);
    } else if (order === 2) {
      status = "in_progress";
      actualStart = getDateOffset(-4);
    }

    await StoryStage.create({
      storyId: story3._id,
      stageId: stage._id,
      stageOrder: order,
      taskName: `#55103-${stage.name}`,
      description: `Vault audit for ${stage.name}.`,
      plannedStartDate: getDateOffset(-7 + order * 2),
      plannedEndDate: getDateOffset(-5 + order * 2),
      actualStartDate: actualStart,
      actualEndDate: actualEnd,
      developBy: mainUser._id,
      githubPrLink: order === 1 ? "https://github.com/org/repo/pull/301" : undefined,
      branchName: order === 1 ? "refactor/vault-audit-init" : undefined,
      status,
      githubRepo: order === 1 ? "org/repo" : undefined,
      prStatus: status === "completed" ? "merged" : "none",
      implementationDescription: `Auditing for Stage ${order}.`,
    });
  }

  console.log("Seeded 3 Parent Stories with mapped StoryUsers and StoryStages.");
  console.log("=========================================");
  console.log("DATABASE SEED COMPLETED SUCCESSFULLY!");
  console.log(`- Seeded Users: ${await User.countDocuments()}`);
  console.log(`- Seeded StageDefinitions: ${await StageDefinition.countDocuments()}`);
  console.log(`- Seeded Stories: ${await Story.countDocuments()}`);
  console.log(`- Seeded StoryUsers: ${await StoryUser.countDocuments()}`);
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
