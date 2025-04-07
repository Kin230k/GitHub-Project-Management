// subIssue.js
import fs from "fs";
import readline from "readline";
import { graphql } from "@octokit/graphql";
import dotenv from "dotenv";
import { hideBin } from "yargs/helpers";
dotenv.config();

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("❌ Missing GITHUB_TOKEN in .env");
  process.exit(1);
}

const args = hideBin(process.argv);
let repo;

if (args.length >= 1) {
  repo = args[0];
} else {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = (q) => new Promise((res) => rl.question(q, res));
  repo = await ask("Enter the target repository name (e.g. my-repo): ");
  rl.close();
  repo = repo.trim();
}

const gql = graphql.defaults({ headers: { authorization: `token ${token}` } });

function parseTSV(filepath) {
  const raw = fs.readFileSync(filepath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split("\t").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim()]));
  });
}

function extractIssueNumber(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/issues\/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

async function getIssueId(owner, repo, issueNumber) {
  const query = `
    query ($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          id
        }
      }
    }
  `;
  const result = await gql(query, { owner, repo, issueNumber });
  return result.repository.issue.id;
}

async function linkIssues(parentId, childId, childNum, parentNum) {
  const mutation = `
    mutation ($input: AddSubIssueInput!) {
      addSubIssue(input: $input) {
        issue { id }
        subIssue { id }
      }
    }
  `;

  try {
    await gql(mutation, {
      input: {
        issueId: parentId,
        subIssueId: childId,
      },
    });
    console.log(`🔗 Linked issue #${childNum} as child of #${parentNum}`);
  } catch (err) {
    console.error(
      `❌ Failed to link issue #${childNum} to #${parentNum}:`,
      err.message
    );
  }
}

(async () => {
  const owner = "Kin230k";
  const rows = parseTSV("parents.tsv");
  console.log("👀 First row sample:", rows[0]);

  for (const row of rows) {
    if (!row.URL) {
      console.warn("⚠️ Skipping row with missing URL:", row);
      continue;
    }

    console.log("📦 Checking row:", row);
    console.log("🔍 Parent field raw value:", row["Parent issue"]);

    const childNumber = extractIssueNumber(row.URL);
    const parentNumber = extractIssueNumber(row["Parent issue"]);

    if (!childNumber) {
      console.warn("⚠️ Skipping row with invalid or missing child issue:", row);
      continue;
    }

    if (!parentNumber) {
      console.log(
        `ℹ️ No parent specified for issue #${childNumber}, skipping link.`
      );
      continue;
    }

    try {
      const childId = await getIssueId(owner, repo, childNumber);
      const parentId = await getIssueId(owner, repo, parentNumber);
      await linkIssues(parentId, childId, childNumber, parentNumber);
    } catch (err) {
      console.error(
        `❌ Could not link issue #${childNumber} to #${parentNumber}:`,
        err.message
      );
    }
  }
})();
