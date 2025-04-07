// index.js
import dotenv from "dotenv";
dotenv.config();

import { Octokit } from "@octokit/rest";
import fs from "fs";
import { execSync } from "child_process";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { parse } from "csv-parse/sync";

const argv = (() => {
  const args = hideBin(process.argv);
  if (args.length === 2) {
    return { origin: args[0], target: args[1] };
  }
  return yargs(args)
    .option("origin", {
      alias: "o",
      type: "string",
      describe: "Origin repository (owner/repo)",
      demandOption: false,
    })
    .option("target", {
      alias: "t",
      type: "string",
      describe: "Target repository (owner/repo)",
      demandOption: false,
    })
    .help().argv;
})();

(async () => {
  console.log("🔐 Loading GitHub token...");
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("❌ Please add GITHUB_TOKEN to your .env file");
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  let originRepo = argv.origin;
  let targetRepo = argv.target;
  const defaultOwner = "Kin230k";

  if (!originRepo || !targetRepo) {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const prompt = (question) =>
      new Promise((resolve) => rl.question(question, resolve));
    if (!originRepo)
      originRepo = await prompt("Enter origin repo name (without owner): ");
    if (!targetRepo)
      targetRepo = await prompt("Enter target repo name (without owner): ");
    rl.close();
  }

  const originOwner = defaultOwner;
  const targetOwner = defaultOwner;
  const origin = `${originOwner}/${originRepo}`;
  const target = `${targetOwner}/${targetRepo}`;

  console.log(`📦 Cloning ${origin} repository...`);
  execSync(`git clone --bare https://github.com/${origin}.git`, {
    stdio: "inherit",
  });

  console.log(`📤 Pushing to ${target} repository...`);
  process.chdir(`${originRepo}.git`);
  execSync(`git push --mirror https://github.com/${target}.git`, {
    stdio: "inherit",
  });
  process.chdir("..");
  fs.rmSync(`${originRepo}.git`, { recursive: true, force: true });

  async function copySettings() {
    console.log("⚙️ Copying repository settings...");
    const { data: originRepoData } = await octokit.repos.get({
      owner: originOwner,
      repo: originRepo,
    });
    try {
      await octokit.repos.update({
        owner: targetOwner,
        repo: targetRepo,
        name: targetRepo,
        description: originRepoData.description,
        homepage: originRepoData.homepage,
        private: originRepoData.private,
        has_issues: originRepoData.has_issues,
        has_projects: originRepoData.has_projects,
        has_wiki: originRepoData.has_wiki,
        default_branch: originRepoData.default_branch,
        allow_squash_merge: originRepoData.allow_squash_merge,
        allow_merge_commit: originRepoData.allow_merge_commit,
        allow_rebase_merge: originRepoData.allow_rebase_merge,
        allow_auto_merge: originRepoData.allow_auto_merge,
        delete_branch_on_merge: originRepoData.delete_branch_on_merge,
      });

      const { data: protection } = await octokit.repos.getBranchProtection({
        owner: originOwner,
        repo: originRepo,
        branch: originRepoData.default_branch,
      });

      await octokit.repos.updateBranchProtection({
        owner: targetOwner,
        repo: targetRepo,
        branch: originRepoData.default_branch,
        required_status_checks: protection.required_status_checks,
        enforce_admins: protection.enforce_admins.enabled,
        required_pull_request_reviews: protection.required_pull_request_reviews,
        restrictions: protection.restrictions,
      });

      console.log("🛡️ Applied Branch Protection:");
      console.log(
        JSON.stringify(
          {
            required_status_checks: protection.required_status_checks,
            enforce_admins: protection.enforce_admins,
            required_pull_request_reviews:
              protection.required_pull_request_reviews,
            restrictions: protection.restrictions,
          },
          null,
          2
        )
      );

      console.log("✅ Repository settings and branch protection rules copied.");
    } catch (err) {
      console.error("❌ Failed to copy settings:", err.message);
    }
  }

  console.log("📚 Copying issues, milestones, labels, and wiki...");

  async function copyLabels() {
    console.log("🏷️  Copying labels...");
    const labels = await octokit.issues.listLabelsForRepo({
      owner: originOwner,
      repo: originRepo,
    });
    for (const label of labels.data) {
      console.log(`➡️  Creating label: ${label.name}`);
      try {
        await octokit.issues.createLabel({
          owner: targetOwner,
          repo: targetRepo,
          name: label.name,
          color: label.color,
          description: label.description || "",
        });
      } catch (err) {
        console.warn(
          `⚠️  Label '${label.name}' skipped (possibly exists):`,
          err.message
        );
      }
    }
  }

  async function copyMilestones() {
    console.log("📌 Copying milestones...");
    const originMilestones = await octokit.issues.listMilestones({
      owner: originOwner,
      repo: originRepo,
    });
    const milestoneMap = new Map();

    for (const m of originMilestones.data) {
      console.log(`➡️  Creating milestone: ${m.title}`);
      const milestoneData = {
        owner: targetOwner,
        repo: targetRepo,
        title: m.title,
        state: m.state,
        description: m.description,
      };
      if (m.due_on) {
        milestoneData.due_on = m.due_on;
      }
      try {
        const created = await octokit.issues.createMilestone(milestoneData);
        milestoneMap.set(m.title, created.data.number);
      } catch (err) {
        console.error(
          `❌ Failed to create milestone '${m.title}':`,
          err.message
        );
      }
    }

    return milestoneMap;
  }

  async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function copyIssuesFromTSV(milestoneMap) {
    console.log("🐛 Copying issues from TSV...");
    const tsvContent = fs.readFileSync("update.tsv", "utf-8");
    const records = parse(tsvContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: "\t",
    });

    for (const record of records) {
      const title = record["Title"]?.trim();
      const url = record["URL"]?.trim();
      const labels = record["Labels"] ? [record["Labels"]] : [];
      const milestoneTitle = record["Milestone"]?.trim();
      const assignees = record["Assignees"]
        ? record["Assignees"].split(",").map((a) => a.trim())
        : [];

      let body = "";
      if (url) {
        const match = url.match(/github.com\/(.+?)\/(.+?)\/issues\/(\d+)/);
        if (match) {
          const [, owner, repo, number] = match;
          try {
            const { data: issue } = await octokit.issues.get({
              owner,
              repo,
              issue_number: Number(number),
            });
            body = issue.body || "";
          } catch (err) {
            console.warn(
              `⚠️ Failed to fetch original issue body from ${url}:`,
              err.message
            );
          }
        }
      }

      console.log(`➡️  Creating issue from TSV: ${title}`);
      const issueData = {
        owner: targetOwner,
        repo: targetRepo,
        title,
        body,
        labels,
        assignees,
      };

      if (milestoneTitle && milestoneMap.has(milestoneTitle)) {
        issueData.milestone = milestoneMap.get(milestoneTitle);
      }

      let retryDelay = 60000;
      let attempt = 1;
      while (true) {
        try {
          await octokit.issues.create(issueData);
          break;
        } catch (err) {
          if (
            err.status === 403 &&
            err.message.includes("secondary rate limit")
          ) {
            console.warn(
              `⏱ Rate limit hit. Waiting ${
                retryDelay / 1000
              } seconds before retrying (attempt ${attempt})...`
            );
            await delay(retryDelay);
            retryDelay += 60000;
            attempt++;
          } else {
            console.error(`❌ Failed to create issue '${title}':`, err.message);
            break;
          }
        }
      }
    }
  }

  async function copyWiki() {
    console.log("📖 Copying wiki...");
    try {
      execSync(`git clone https://github.com/${origin}.wiki.git`, {
        stdio: "inherit",
      });
      console.log("📥 Wiki cloned, pushing to new repo...");
      execSync(
        `cd ${originRepo}.wiki && git remote set-url origin https://github.com/${target}.wiki.git && git push --mirror`,
        { stdio: "inherit", shell: true }
      );
      fs.rmSync(`${originRepo}.wiki`, { recursive: true, force: true });
    } catch (err) {
      console.warn("⚠️  Wiki clone/push failed:", err.message);
    }
  }

  console.log("🚚 Transferring metadata...");
  await copySettings();
  await copyLabels();
  const milestoneMap = await copyMilestones();
  await copyIssuesFromTSV(milestoneMap);
  await copyWiki();

  console.log("\n📊 Migration Summary");
  const summary = {
    origin,
    target,
    timestamp: new Date().toISOString(),
    settings: true,
    labels: true,
    milestones: true,
    issues: true,
    wiki: true,
  };
  console.log(JSON.stringify(summary, null, 2));

  console.log("✅ Done! Repository contents and metadata copied successfully.");
})();
