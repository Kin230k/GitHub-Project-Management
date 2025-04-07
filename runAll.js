// runAll.js
import { execSync } from "child_process";
import dotenv from "dotenv";
import { hideBin } from "yargs/helpers";
import inquirer from "inquirer";
dotenv.config();

let originRepo = "Template",
  targetRepo,
  projectStartDate;
const args = hideBin(process.argv);

if (args.length >= 2) {
  [targetRepo, projectStartDate] = args;
} else {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const ask = (q) => new Promise((res) => rl.question(q, res));
  targetRepo = await ask(
    "Enter target repo name (also used as project name): "
  );
  rl.close();
  targetRepo = targetRepo.trim();
}

if (!projectStartDate) {
  const { startDate } = await inquirer.prompt([
    {
      type: "input",
      name: "startDate",
      message: "Enter project start date (YYYY-MM-DD):",
      validate: (input) =>
        /\d{4}-\d{2}-\d{2}/.test(input) || "Please use format YYYY-MM-DD",
    },
  ]);
  projectStartDate = startDate;
}

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

const sprintEndDate = addDays(projectStartDate, 79);

async function confirmWithChoices(question, actionMessage) {
  const { answer } = await inquirer.prompt([
    {
      type: "list",
      name: "answer",
      message: question,
      choices: ["Yes", "No"],
    },
  ]);

  if (answer === "No") {
    console.log("\n" + actionMessage);
    await inquirer.prompt([
      {
        type: "input",
        name: "continue",
        message: "Press Enter to continue...",
      },
    ]);
  }
}

// Initial confirmations before execution
const initialSetup = async () => {
  await confirmWithChoices(
    "Did you create the repository?",
    "Please create the repository on GitHub, then press Enter to continue."
  );
  await confirmWithChoices(
    "Did you start the wiki in the repository?",
    "Please open the repository wiki and create an empty page, then press Enter to continue."
  );
  await confirmWithChoices(
    "Did you create a copy of the [Template] project?",
    "Please go to GitHub Projects, create a copy from [Template], then press Enter to continue."
  );
  await confirmWithChoices(
    "Did you add the issues workflow?",
    `Please go to the project >> Workflow >> Add to project >> Paste this line:

  is:issue,pr is:open label:Task

  Then press Enter to continue.`
  );
  await confirmWithChoices(
    "Did you link the project to the repository?",
    "Please link the GitHub Project to the repository, then press Enter to continue."
  );
  await confirmWithChoices(
    "Is the repository correct in the workflow?",
    "Make sure the workflow uses the correct repository, then press Enter to continue."
  );
  await confirmWithChoices(
    "Is the repository in the workflow the same as the project?",
    "Please choose the same repository used in the project, then press Enter to continue."
  );
};

await initialSetup();

const steps = [
  {
    name: "Clone and migrate repository",
    command: `node index.js ${originRepo} ${targetRepo}`,
  },
  {
    name: "Update GitHub Project fields",
    command: `node project.js "${targetRepo}" "${projectStartDate}"`,
  },
  {
    name: "Link parent-child issues",
    command: `node subIssue.js "${targetRepo}"`,
  },
];

(async () => {
  for (const step of steps) {
    console.log(`\n🚀 Starting: ${step.name}`);
    try {
      execSync(step.command, { stdio: "inherit", shell: true });
      console.log(`✅ Completed: ${step.name}`);
    } catch (error) {
      console.error(`❌ Failed during: ${step.name}`);
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log("\n🎯 All steps completed successfully.");

  // Post-setup manual tasks
  const finalTasks = [
    {
      question:
        "Did you enable 'Require contributors to sign off on web-based commits'?",
      message:
        "Please enable 'Require contributors to sign off on web-based commits' in the repo settings, then press Enter to continue.",
    },
    {
      question: "Did you enable Discussions?",
      message:
        "Please enable Discussions from the repository settings tab, then press Enter to continue.",
    },
    {
      question:
        "Did you change 'Allow merge commits' default message to 'Pull request title and description'?",
      message:
        "Please update the default message for merge commits to 'Pull request title and description', then press Enter to continue.",
    },
    {
      question:
        "Did you change 'Allow squash merging' default message to 'Pull request title and commit details'?",
      message:
        "Please update the default squash commit message accordingly, then press Enter to continue.",
    },
    {
      question:
        "Did you check 'Always suggest updating pull request branches'?",
      message:
        "Please enable 'Always suggest updating pull request branches' in the repo settings, then press Enter to continue.",
    },
    {
      question:
        "Did you check 'Limit how many branches and tags can be updated in a single push'?",
      message: "Please enable the limit option, then press Enter to continue.",
    },
    {
      question: "Did you set the limit to 3 branches/tags per push?",
      message:
        "Please set the number limit to 3 branches/tags in the push settings, then press Enter to continue.",
    },
    {
      question:
        "Did you export rulesets from Template repo and import them to the new repo?",
      message:
        "Go to Template repo >> Settings >> Rulesets >> Export all, then go to the new repo and import them. Press Enter to continue.",
    },
    {
      question: `Did you update the sprint dates from ${projectStartDate} to ${sprintEndDate}?`,
      message: `Please change the sprint date range in the project settings to:

  Start: ${projectStartDate}
  End:   ${sprintEndDate}

Then press Enter to continue.`,
    },
    {
      question: "Did you add the development sprint to all issues?",
      message:
        "Go to the GitHub Project board and make sure all issues are assigned to the development sprint. Then press Enter to continue.",
    },
    {
      question: "Did you add a meeting discussion category?",
      message:
        "Please go to Discussions and add a 'Meetings' category for meeting notes. Press Enter to continue.",
    },
    {
      question: "Did you create the standard discussion sections?",
      message: `Please create the following discussion sections:

#️⃣ Brain Storming
💡 Ideas - Share ideas for new features
🗳️ Polls - Take a vote from the community
#️⃣ General
💬 General - Chat about anything and everything here
🙏 Q&A - Answers enabled · Ask the community for help
🙌 Show and tell - Show off something you've made
#️⃣ Project Documentations
📣 Announcements - Updates from maintainers
#️⃣ Meetings - Meetings Notes will be in this category.

Then press Enter to continue.`,
    },
    {
      question: "Did you change the wiki sidebar link to the project name?",
      message:
        "Please rename the wiki sidebar link to match the project name, then press Enter to continue.",
    },
  ];

  for (const task of finalTasks) {
    await confirmWithChoices(task.question, task.message);
  }

  console.log(
    "\n📘 Please go to the wiki and begin updating it according to the project documentation and structure."
  );
})();
