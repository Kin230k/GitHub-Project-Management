import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Get repo name from command line argument
const [repo] = process.argv.slice(2);
const owner = "Kin230k";

if (!repo) {
  console.error("❌ Usage: node cleanIssues.js <repo>");
  process.exit(1);
}

// Regex to match the block starting with "Original issue by @" until "---\n"
const blockToRemoveRegex =
  /Original issue by @\w+ on \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\n\n---\n?/;

async function cleanIssues() {
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data: issues } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "all",
      per_page: perPage,
      page,
    });

    if (issues.length === 0) break;

    for (const issue of issues) {
      const { number, body } = issue;

      if (!body) continue;

      const cleanedBody = body.replace(blockToRemoveRegex, "");

      if (cleanedBody !== body) {
        await octokit.issues.update({
          owner,
          repo,
          issue_number: number,
          body: cleanedBody,
        });
        console.log(`✅ Updated issue #${number}`);
      } else {
        console.log(`⏭ No match in issue #${number}`);
      }
    }

    page++;
  }
}

cleanIssues().catch(console.error);
