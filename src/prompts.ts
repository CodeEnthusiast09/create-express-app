import inquirer from "inquirer";

/**
 * User Choices Interface
 *
 * This defines what information we collect from the user
 */
export interface ProjectConfig {
  projectName: string;
  database: "mongodb" | "postgresql";
  orm?: "prisma" | "drizzle"; // Only for PostgreSQL
  includeDocker: boolean;
}

/**
 * Ask User Questions
 *
 * This function shows interactive prompts and returns user's choices.
 * Uses inquirer to create a nice CLI experience.
 */
export async function promptUser(projectName?: string): Promise<ProjectConfig> {
  const answers = await inquirer.prompt([
    // Project Name
    {
      type: "input",
      name: "projectName",
      message: "Project name:",
      default: projectName || "my-express-app",
      validate: (input: string) => {
        // Check if name is valid (no spaces, special chars, etc.)
        if (/^[a-z0-9-_]+$/.test(input)) {
          return true;
        }
        return "Project name can only contain lowercase letters, numbers, hyphens, and underscores";
      },
    },

    // Database Choice
    {
      type: "list",
      name: "database",
      message: "Which database do you want to use?",
      choices: [
        { name: "MongoDB (with Mongoose)", value: "mongodb" },
        { name: "PostgreSQL (with Prisma or Drizzle)", value: "postgresql" },
      ],
    },

    // ORM Choice (only if PostgreSQL selected)
    {
      type: "list",
      name: "orm",
      message: "Which ORM for PostgreSQL?",
      choices: [
        {
          name: "Prisma (recommended - great DX, migrations)",
          value: "prisma",
        },
        {
          name: "Drizzle (newer - more type-safe, better performance)",
          value: "drizzle",
        },
      ],
      when: (answers) => answers.database === "postgresql",
    },

    // Docker
    {
      type: "confirm",
      name: "includeDocker",
      message: "Include Docker setup?",
      default: true,
    },
  ]);

  return answers as ProjectConfig;
}
