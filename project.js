// project.js
import fs from "fs";
import readline from "readline";
import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("❌ Missing GITHUB_TOKEN in .env");
  process.exit(1);
}

let projectName, targetRepo, baseDate;
const args = process.argv.slice(2);

if (args.length >= 1) {
  projectName = args[0];
  targetRepo = args[0];
  baseDate = args[1];
} else {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = (q) => new Promise((res) => rl.question(q, res));
  projectName = await ask("Enter the GitHub project name (same as repo): ");
  targetRepo = projectName;
  baseDate = await ask("Enter the base date (YYYY-MM-DD): ");
  rl.close();
}

const octokit = new Octokit({ auth: token });
const gql = graphql.defaults({ headers: { authorization: `token ${token}` } });

function parseTSV(filepath) {
  const raw = fs.readFileSync(filepath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split("\t");
  const rows = lines.slice(1).map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i]]));
  });
  return { headers: headers.map((h) => h.trim()), rows };
}

async function getUserProjectId(projectName) {
  const query = `
    query ($login: String!) {
      user(login: $login) {
        projectsV2(first: 50) {
          nodes {
            id
            title
          }
        }
      }
    }
  `;
  const res = await gql(query, { login: "Kin230k" });
  const project = res.user.projectsV2.nodes.find(
    (p) => p.title === projectName
  );
  if (!project) throw new Error(`❌ Project '${projectName}' not found.`);
  return project.id;
}

async function getProjectItems(projectId) {
  let items = [];
  let hasNextPage = true;
  let after = null;

  while (hasNextPage) {
    const query = `
      query ($projectId: ID!, $after: String) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                content {
                  ... on Issue { title number }
                }
              }
            }
          }
        }
      }
    `;

    const res = await gql(query, { projectId, after });
    const page = res.node.items;
    items.push(...page.nodes);
    hasNextPage = page.pageInfo.hasNextPage;
    after = page.pageInfo.endCursor;
  }

  return items;
}

async function getProjectFields(projectId) {
  const query = `
    query ($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 50) {
            nodes {
              ... on ProjectV2FieldCommon {
                id
                name
                dataType
              }
            }
          }
        }
      }
    }
  `;
  const res = await gql(query, { projectId });
  return res.node.fields.nodes;
}

async function updateFieldValue(
  projectId,
  itemId,
  fieldId,
  value,
  dataType,
  key,
  targetRepo,
  items
) {
  const mutation = `
    mutation ($input: UpdateProjectV2ItemFieldValueInput!) {
      updateProjectV2ItemFieldValue(input: $input) {
        projectV2Item {
          id
        }
      }
    }
  `;

  let preparedValue;
  try {
    let cleanedValue =
      typeof value === "string" ? value.trim().replace(/^"|"$/g, "") : value;
    preparedValue =
      dataType === "NUMBER"
        ? { number: parseFloat(cleanedValue) }
        : dataType === "DATE"
        ? { date: cleanedValue }
        : dataType === "SINGLE_SELECT"
        ? { singleSelectOptionId: await getOptionId(fieldId, cleanedValue) }
        : dataType === "ITERATION"
        ? { iterationId: await getIterationId(fieldId, cleanedValue) }
        : dataType === "TEXT" || key === "Depend on #" || key === "Parent issue"
        ? { text: cleanedValue }
        : cleanedValue;
  } catch (error) {
    console.error(
      `❌ Failed to prepare value for '${key}' with value '${value}': ${error.message}`
    );
    throw error;
  }

  await gql(mutation, {
    input: { projectId, itemId, fieldId, value: preparedValue },
  });
}

async function getIterationId(fieldId, label) {
  const query = `
    query ($fieldId: ID!) {
      node(id: $fieldId) {
        ... on ProjectV2IterationField {
          configuration {
            iterations {
              id
              title
            }
          }
        }
      }
    }
  `;
  const res = await gql(query, { fieldId });
  const option = res.node.configuration.iterations.find(
    (i) => i.title === label
  );
  if (!option) throw new Error(`Iteration '${label}' not found.`);
  return option.id;
}

async function getOptionId(fieldId, label) {
  const query = `
    query ($fieldId: ID!) {
      node(id: $fieldId) {
        ... on ProjectV2SingleSelectField {
          options {
            id
            name
          }
        }
      }
    }
  `;
  const res = await gql(query, { fieldId });
  const option = res.node.options.find((o) => o.name === label);
  if (!option) throw new Error(`Option '${label}' not found for select field.`);
  return option.id;
}

function shiftDate(dateStr, diffDays) {
  if (!dateStr || typeof dateStr !== "string") return null;

  const date = new Date(dateStr);
  if (isNaN(date)) return null;

  date.setDate(date.getDate() + diffDays);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function updateMilestoneDates(diffDays) {
  const { data: milestones } = await octokit.issues.listMilestones({
    owner: "Kin230k",
    repo: targetRepo,
    state: "open",
  });

  for (const ms of milestones) {
    if (!ms.due_on) continue;
    const shifted = shiftDate(ms.due_on, diffDays);
    if (!shifted) continue;

    await octokit.issues.updateMilestone({
      owner: "Kin230k",
      repo: targetRepo,
      milestone_number: ms.number,
      due_on: shifted + "T00:00:00Z",
    });

    console.log(`📆 Updated milestone '${ms.title}' due date to ${shifted}`);
  }
}

async function updateProjectFields(projectName, targetRepo, { headers, rows }) {
  const projectId = await getUserProjectId(projectName);
  const items = await getProjectItems(projectId);
  const fields = await getProjectFields(projectId);
  const fieldMap = Object.fromEntries(fields.map((f) => [f.name.trim(), f]));
  const titleToNumberMap = Object.fromEntries(
    items.map((i) => [i.content?.title, i.content?.number])
  );

  const base = new Date(baseDate);
  const firstStartRow = rows.find((r) => r.Starts);
  const firstStartDate = firstStartRow ? new Date(firstStartRow.Starts) : null;
  const diffDays =
    base && firstStartDate
      ? Math.floor((base - firstStartDate) / (1000 * 60 * 60 * 24))
      : 0;

  await updateMilestoneDates(diffDays);

  for (const row of rows) {
    const item = items.find((i) => i.content?.title === row.Title);
    if (!item) {
      console.warn(`⚠️  Issue titled '${row.Title}' not found in project.`);
      continue;
    }

    const fieldsToUpdate = ["Starts", "Due", "Type", "Phase", "Sprint"];

    for (const key of headers) {
      if (
        key.trim().toLowerCase() === "title" ||
        !fieldsToUpdate
          .map((f) => f.toLowerCase())
          .includes(key.trim().toLowerCase())
      )
        continue;
      const oldValue = row[key];
      if (
        typeof oldValue === "string" &&
        oldValue.startsWith("https://github.com/")
      ) {
        const issueNumber = titleToNumberMap[row.Title];
        if (issueNumber) {
          row[
            key
          ] = `https://github.com/Kin230k/${targetRepo}/issues/${issueNumber}`;
        }
      }
    }

    for (const key of headers) {
      if (
        key.trim().toLowerCase() === "title" ||
        !fieldsToUpdate
          .map((f) => f.toLowerCase())
          .includes(key.trim().toLowerCase())
      )
        continue;
      let value = row[key];

      const field = fieldMap[key.trim()];
      try {
        if (!field) {
          console.warn(`⚠️  Field '${key}' not found in project.`);
          continue;
        }

        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
        ) {
          console.log(
            `⚠️  Skipping empty value for '${key}' in '${row.Title}'`
          );
          continue;
        }

        if (field.dataType === "DATE") {
          value = shiftDate(value, diffDays);
          if (!value) {
            console.warn(
              `⚠️  Invalid date for '${key}' in '${row.Title}', skipping.`
            );
            continue;
          }
        }

        await updateFieldValue(
          projectId,
          item.id,
          field.id,
          value,
          field.dataType,
          key,
          targetRepo,
          items
        );
        console.log(`✅ Updated '${key}' for '${row.Title}' to '${value}'`);
      } catch (err) {
        console.error(
          `❌ Failed to update '${key}' for '${row.Title}':`,
          err.message
        );
      }
    }
  }
}

(async () => {
  const data = parseTSV("update.tsv");
  await updateProjectFields(projectName, targetRepo, data);
})();
