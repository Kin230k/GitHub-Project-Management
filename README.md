Description
=============================================

This repository contains a set of scripts and tools designed to automate project management tasks on GitHub, streamline workflow management, and enhance collaboration through GitHub Project automation. It includes functionalities such as task scheduling, dependency management, metadata synchronization between repositories, and project management operations using the GitHub GraphQL API.

🛠️ GitHub Repository Migration and Setup Automation
====================================================

This Node.js script automates the migration and initial setup of a new GitHub repository and project based on a predefined "Template" repository. It walks the user through critical steps, automates key tasks, and ensures consistent project setup following best practices.

* * * * *

📋 What This Script Does
------------------------

1.  **Clones and Migrates** a Template Repository to a New Repository.

2.  **Updates Project Fields** using the new repository name and project start date.

3.  **Links Parent and Child Issues** automatically based on project relationships.

4.  **Guides Manual Confirmations** for important project setup tasks:

    -   Repository settings (e.g., merge strategies, sign-off requirements).

    -   GitHub Discussions setup and customization.

    -   Project board workflow and sprint configuration.

    -   Wiki configuration and renaming.

    -   Rulesets export/import from the Template repository.

5.  **Ensures Sprint Planning** by calculating and providing sprint start and end dates automatically based on user input.

* * * * *

🚀 How to Use
-------------

1.  **Install dependencies:**

bash

CopyEdit

`npm install`

(Make sure `inquirer` and `dotenv` are installed.)

1.  **Prepare your `.env` file:**\
    Add any required environment variables if your internal scripts (like `index.js`, `project.js`, `subIssue.js`) use GitHub authentication or API tokens.

2.  **Run the script:**

You can run the script in two ways:

-   **Interactive Mode (no arguments):**

bash

CopyEdit

`node runAll.js`

The script will **ask** for:

-   Target repository name

-   Project start date (YYYY-MM-DD format)

-   **Direct Mode (with arguments):**

bash

CopyEdit

`node runAll.js <target-repo-name> <project-start-date>`

Example:

bash

CopyEdit

`node runAll.js PM-Website 2025-04-01`

> -   The first argument is the new repository name.
>
>
> -   The second argument is the project start date (`YYYY-MM-DD`).

* * * * *

📚 Step-by-Step Flow
--------------------

After running, the script will:

1.  **Clone the Template repository** and create a new repository.

2.  **Create and setup a GitHub Project** associated with the new repository.

3.  **Link parent-child relationships** between GitHub Issues.

4.  **Guide you through critical manual tasks** like:

    -   Enabling repository protections.

    -   Setting up discussions sections and meetings.

    -   Exporting and importing rulesets from the Template.

    -   Assigning a development sprint to all issues.

    -   Updating sprint dates.

    -   Changing the wiki sidebar link to the project name.

Each step **asks for confirmation** so you can complete manual actions when necessary before continuing.

* * * * *

✍️ Example of Manual Tasks You'll Be Guided Through
---------------------------------------------------

-   Enable "Require contributors to sign off on web-based commits."

-   Enable GitHub Discussions and create categories:

    -   Brain Storming, Ideas, Polls, General, Q&A, Show and Tell, Project Documentation, Meetings

-   Set default messages for merge and squash commits.

-   Always suggest updating pull request branches.

-   Limit branches/tags updated per push to 3.

-   Export and import Rulesets.

-   Update sprint start and end dates.

-   Add all issues to the development sprint.

-   Rename the wiki sidebar link.

* * * * *

📌 Notes
--------

-   The origin (template) repository is **always** `"Template"` --- you do not need to specify it.

-   The script is meant to standardize how new repositories are created and initialized from a template, saving time and avoiding mistakes.

-   This script requires basic familiarity with GitHub Projects, Discussions, and Settings to perform the manual parts.

-   This script does **not** automatically create discussions or modify settings via GitHub API (for now) --- manual confirmation is required.

* * * * *

🤝 Contributing
---------------

If you have ideas to improve this script, automate more steps, or integrate more GitHub APIs (e.g., create discussions automatically), feel free to open a pull request or discussion!

🛠️ GitHub Repository Mirror and Metadata Copier
================================================

This project provides a Node.js script to **fully mirror** a GitHub repository --- not just its code, but also its **metadata** including:

-   Repository settings

-   Branch protection rules

-   Labels

-   Milestones

-   Issues

-   Wiki pages

It is designed to **automate** the process of duplicating repositories for backup, migration, or template purposes.

* * * * *

📄 What This Script Does
------------------------

1.  **Clone** the origin repository as a **bare** repo and **mirror-push** it to the target repository.

2.  **Copy repository settings** (description, homepage, visibility, features like issues/projects/wiki).

3.  **Copy branch protection rules** to maintain workflow safety.

4.  **Copy all labels** used in the issues.

5.  **Copy all milestones** used for tracking.

6.  **Copy all issues**:

    -   Issues are created in the same order they appeared in the original repo (based on the TSV file).

    -   The script **preserves the original body text** of each issue by fetching it live from GitHub.

    -   Labels, milestones, and assignees are recreated if available.

7.  **Copy the Wiki** by cloning and pushing the `.wiki.git` repository.

Finally, it prints a 📊 **Migration Summary** confirming successful copying.

* * * * *

🚀 How to Use
-------------

### 1\. Prerequisites

-   **Node.js v18+** installed

-   **Git** installed

-   A **GitHub Personal Access Token (PAT)** with permissions for:

    -   `repo` (full access to private/public repos)

    -   `read:org` (if working in organizations)

### 2\. Install Dependencies

bash

CopyEdit

`npm install
npm install csv-parse`

### 3\. Setup `.env`

Create a `.env` file and add your GitHub token:

env

CopyEdit

`GITHUB_TOKEN=your_personal_access_token_here`

### 4\. Prepare `update.tsv`

Create a file called `update.tsv` (tab-separated values) containing at least:

| Title | URL | Labels | Milestone | Assignees |
| --- | --- | --- | --- | --- |
| Issue Title 1 | <https://github.com/owner/repo/issues/1> | Label1 | Milestone1 | user1 |
| Issue Title 2 | <https://github.com/owner/repo/issues/2> | Label2 | Milestone2 | user2 |

-   `URL` must point to the original issue to fetch the body.

-   `Labels`, `Milestone`, and `Assignees` are optional.

> 📝 You can export this TSV easily from GitHub Project views.

### 5\. Run the Script

bash

CopyEdit

`node index.js --origin origin-repo-name --target target-repo-name`

You can also omit the arguments and the script will prompt you interactively.

Example:

bash

CopyEdit

`node index.js --origin template-repo --target new-project-repo`

* * * * *

🛡️ Notes
---------

-   **Rate Limiting**: If you have a lot of issues, GitHub's secondary rate limits might kick in. The script will automatically **wait and retry** when it hits these limits.

-   **Error Handling**: Failed operations (e.g., existing labels, missing milestones) are logged as warnings without stopping the migration.

-   **Wiki**: If the repository has no wiki enabled, the wiki copy step will safely fail without crashing.

* * * * *

📌 Why Use This Script?
-----------------------

-   Fully mirror a GitHub repository with metadata.

-   Set up template repositories for your team or organization.

-   Archive important repositories, including their issues and discussions.

-   Clone private repositories to other accounts.

* * * * *

💬 Future Improvements (PRs Welcome!)
-------------------------------------

-   Copy Pull Requests (currently only issues are copied).

-   Copy Discussions and Projects.

-   Handle GitHub Enterprise custom domains.

-   Support mapping users from one organization to another.


GitHub Project Fields Updater
=============================

This script automates updating fields in a **GitHub Projects (V2)** board based on data from a `.tsv` (Tab-Separated Values) file.\
It is designed to help manage large projects by batch-updating issues, dates, types, phases, sprints, and milestones --- all with one command.

* * * * *

✨ What This Script Does
-----------------------

-   🔄 **Update Project Fields**: Updates fields like `Starts`, `Due`, `Type`, `Phase`, and `Sprint` for issues in a GitHub Project V2.

-   📅 **Shift Dates**: Automatically shifts all dates (Start, Due) based on a **base date** you provide when running the script.

-   🗓️ **Update Milestones**: Shifts all open milestone due dates by the same difference.

-   🌀 **Assign Sprints**: Assigns issues to the correct sprint (iteration) based on the TSV file.

-   📋 **Batch Processing**: Reads a simple TSV file (`update.tsv`) and processes all issues at once.

-   🛡️ **Safe Handling**: Skips invalid or empty fields and logs detailed success and warning messages.

* * * * *

🛠️ How to Use
--------------

1.  **Prepare your `.env` file**

    Create a `.env` file in your project folder with your GitHub token:

    ini

    CopyEdit

    `GITHUB_TOKEN=your_personal_access_token_here`

    The token must have at least `repo` and `project` permissions.

* * * * *

1.  **Prepare your TSV file**

    Create a file named `update.tsv` with the following columns:

    | Title | Starts | Due | Type | Phase | Sprint |
    | --- | --- | --- | --- | --- | --- |
    | The title of the GitHub Issue (must match exactly) | Start date (e.g., `Jan 1, 2025`) | Due date (e.g., `Jan 15, 2025`) | Type name | Phase name | Sprint name |

    Example:

    yaml

    CopyEdit

    `Title	Starts	Due	Type	Phase	Sprint
    Feature A	Jan 1, 2025 Jan 10, 2025 Task	Planning	Sprint 1
    Feature B	Jan 5, 2025 Jan 12, 2025 Bug	Development	Sprint 2`

* * * * *

1.  **Run the script**

    Use Node.js to run the script by providing your project name (same as your repo name) and the base start date:

    bash

    CopyEdit

    `node project.js my-repo-name 2025-04-01`

    Example:

    bash

    CopyEdit

    `node project.js CamelCode 2025-04-01`

    -   `my-repo-name`: the GitHub repo name (must match your Project V2 title exactly).

    -   `2025-04-01`: the new base start date for your project.

* * * * *

📌 Important Notes
------------------

-   The **Title** in your TSV must exactly match the **Issue Title** in the GitHub Project.

-   **Dates** in the TSV must be in a readable format like `"Jan 1, 2025"`.

-   The script will automatically detect the correct field type (`TEXT`, `DATE`, `NUMBER`, `SINGLE_SELECT`, `ITERATION`) and update accordingly.

-   **Iteration field start dates cannot be updated** because GitHub currently does not expose that functionality via the GraphQL API.

-   Milestones and issue dates are shifted based on the date difference between the old start date and the new `baseDate` you provide.

-   Any missing or invalid fields will be safely skipped with a warning.

* * * * *

📦 Features Involved
--------------------

-   GitHub REST API (for Milestones)

-   GitHub GraphQL API (for Project V2)

-   Node.js

-   Environment Variables

-   File Parsing (TSV)

* * * * *

🧠 Why Use This Script?
-----------------------

Manually updating a large GitHub Project board is time-consuming and error-prone.\
This script makes it easy to:

-   Plan releases,

-   Update timelines,

-   Reorganize sprints,

-   And synchronize large teams quickly.

All **in one simple command**.


🔗 Link Sub-Issues Script for GitHub Projects
=============================================

This Node.js script **automatically links GitHub issues as parent/child** (sub-issues) based on a simple `parents.tsv` file.\
It uses GitHub's GraphQL API and can **bulk organize issues** into a structured hierarchy --- perfect for project management setups!

* * * * *

✨ What This Script Does
-----------------------

-   Reads a `parents.tsv` file (tab-separated values) that lists issues and their intended parent issues.

-   Extracts the issue numbers from the provided URLs.

-   Links each child issue to its parent issue using GitHub's `addSubIssue` GraphQL mutation.

-   Skips issues that have no parent defined.

-   Logs the results clearly: which issues were linked successfully, skipped, or failed.

* * * * *

📋 `parents.tsv` File Format
----------------------------

The script expects a file called **`parents.tsv`** in the same directory, structured like this:

| Title | URL | Parent issue |
| --- | --- | --- |
| Task A | <https://github.com/username/repo/issues/10> | <https://github.com/username/repo/issues/5> |
| Task B | <https://github.com/username/repo/issues/11> | <https://github.com/username/repo/issues/5> |
| Task C | <https://github.com/username/repo/issues/12> | (empty if no parent) |

-   `URL`: the full link to the child issue.

-   `Parent issue`: the full link to the parent issue. Leave blank if the issue has no parent.

⚠️ **Important:** Make sure there are **no extra spaces or hidden characters** in the headers!

* * * * *

🛠️ How to Use
--------------

1.  **Clone this repository** or download the script.

2.  **Install the dependencies:**

    bash

    CopyEdit

    `npm install @octokit/graphql dotenv yargs`

3.  **Create a `.env` file** in the same folder with your GitHub token:

    ini

    CopyEdit

    `GITHUB_TOKEN=your_personal_access_token_here`

    -   The token must have `repo` and `projects` permissions.

4.  **Prepare the `parents.tsv` file** following the format shown above.

5.  **Run the script:**

    bash

    CopyEdit

    `node subIssue.js your-repo-name`

    Example:

    bash

    CopyEdit

    `node subIssue.js Template`

    If you don't pass the repo name, it will ask you to type it manually.

* * * * *

🛡️ Notes
---------

-   This script only works for **issues** inside a **single repository**.

-   It uses the **GitHub GraphQL API**, not REST API.

-   It safely **skips** rows where the parent issue is not specified.

-   It logs all successes, warnings, and errors during the process.

-   If an issue link fails, it will continue linking others without stopping.

* * * * *

📈 Example Output
-----------------

less

CopyEdit

`🔗 Linked issue #11 as child of #5
🔗 Linked issue #12 as child of #5
ℹ️ No parent specified for issue #13, skipping link.
❌ Failed to link issue #14 to #5: Issue not found`

* * * * *

🤔 Why This Script?
-------------------

Managing many GitHub issues manually is exhausting.\
This tool lets you **bulk create relationships between issues** in seconds, perfect for project templates, product roadmaps, sprint planning, and more.

🧹 GitHub Issue Cleaner Script
==============================

This Node.js script helps you **automatically clean up** your GitHub issues by **removing a specific block of text** from the body of every issue in a repository.

It is particularly useful if you have migrated issues from another system (or another GitHub repo) and each issue body contains a repetitive "Original issue by @user on [date]" line that you want to bulk delete.

* * * * *

📜 What This Script Does
------------------------

-   Connects to your GitHub account using a **Personal Access Token**.

-   Fetches **all issues** (open and closed) in a specified repository.

-   Searches for a text block that looks like this at the beginning of each issue body:

    yaml

    CopyEdit

    `Original issue by @username on 2025-03-21T12:17:06Z

    --- `

-   **Automatically removes** that block if it exists.

-   **Updates** the issue with the cleaned body.

It works **even if the username, date, and time differ** from issue to issue.

* * * * *

🛠️ How to Use
--------------

### 1\. Install Dependencies

You need Node.js installed.

Inside your project directory, run:

bash

CopyEdit

`npm install @octokit/rest dotenv`

### 2\. Prepare Environment Variables

Create a `.env` file in your project folder and add your GitHub token:

env

CopyEdit

`GITHUB_TOKEN=your_personal_access_token`

> Your token must have `repo` permissions.

### 3\. Run the Script

Use the following command in your terminal:

bash

CopyEdit

`node cleanIssues.js <repository-name>`

For example:

bash

CopyEdit

`node cleanIssues.js github-project-tester`

**Note:**

-   The GitHub username (owner) is hardcoded as `Kin230k`.

-   Only the repository name needs to be passed as an argument.

If you forget to provide the repository name, the script will remind you how to use it.

* * * * *

💻 Example
----------

Before cleaning:

yaml

CopyEdit

`Original issue by @Kin230k on 2025-03-21T12:17:06Z

---
This is the real content of the issue.`

After running the script:

pgsql

CopyEdit

`This is the real content of the issue.`

* * * * *

🛡️ Safety Notes
----------------

-   The script only edits issues if the matching block is found.

-   If an issue does not contain the unwanted text, it is **skipped**.

-   All updates are **live** once the script is run.

* * * * *

🚀 Potential Enhancements
-------------------------

-   Dry-run mode to preview changes without applying them.

-   Support for cleaning pull request descriptions.

-   Support for cleaning issues in multiple repositories at once.

