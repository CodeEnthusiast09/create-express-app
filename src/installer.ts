import execa from "execa";
import ora from "ora";
import chalk from "chalk";
import { ProjectConfig } from "./prompts";

/**
 * Installer
 *
 * Handles post-generation tasks:
 * - Installing dependencies
 * - Initializing git repository
 */

export class Installer {
  private projectPath: string;
  private config: ProjectConfig;

  constructor(config: ProjectConfig, projectPath: string) {
    this.config = config;
    this.projectPath = projectPath;
  }

  /**
   * Install Dependencies
   *
   * Runs npm install in the project directory.
   * Also installs database-specific dependencies.
   */
  async installDependencies(): Promise<void> {
    const spinner = ora("Installing dependencies...").start();

    try {
      // Base npm install
      await execa("npm", ["install"], {
        cwd: this.projectPath,
        stdio: "pipe",
      });

      // Install database-specific dependencies
      await this.installDatabaseDependencies();

      spinner.succeed(chalk.green("Dependencies installed"));
    } catch (error) {
      spinner.fail(chalk.red("Failed to install dependencies"));
      throw error;
    }
  }

  /**
   * Install Database-Specific Dependencies
   */
  private async installDatabaseDependencies(): Promise<void> {
    const deps: string[] = [];
    const devDeps: string[] = [];

    if (this.config.database === "mongodb") {
      deps.push("mongoose");
    } else if (this.config.database === "postgresql") {
      if (this.config.orm === "prisma") {
        deps.push("@prisma/client");
        devDeps.push("prisma");
      } else if (this.config.orm === "drizzle") {
        deps.push("drizzle-orm", "pg");
        devDeps.push("drizzle-kit", "@types/pg");
      }
    }

    // Install production dependencies
    if (deps.length > 0) {
      await execa("npm", ["install", ...deps], {
        cwd: this.projectPath,
        stdio: "pipe",
      });
    }

    // Install dev dependencies
    if (devDeps.length > 0) {
      await execa("npm", ["install", "--save-dev", ...devDeps], {
        cwd: this.projectPath,
        stdio: "pipe",
      });
    }
  }

  /**
   * Initialize Git Repository
   *
   * Runs git init and makes an initial commit.
   */
  async initGit(): Promise<void> {
    const spinner = ora("Initializing git repository...").start();

    try {
      // Initialize git
      await execa("git", ["init"], {
        cwd: this.projectPath,
        stdio: "pipe",
      });

      // Configure git user (for the initial commit)
      await execa("git", ["config", "user.email", "user@example.com"], {
        cwd: this.projectPath,
        stdio: "pipe",
      });
      await execa("git", ["config", "user.name", "User"], {
        cwd: this.projectPath,
        stdio: "pipe",
      });

      // Add all files
      await execa("git", ["add", "."], {
        cwd: this.projectPath,
        stdio: "pipe",
      });

      // Initial commit
      await execa(
        "git",
        ["commit", "-m", "feat: initial project setup from create-express-app"],
        {
          cwd: this.projectPath,
          stdio: "pipe",
        },
      );

      spinner.succeed(chalk.green("Git repository initialized"));
    } catch (error) {
      spinner.fail(chalk.red("Failed to initialize git"));
      // Don't throw - git init failing shouldn't stop the whole process
      console.warn(chalk.yellow("You can initialize git manually later"));
    }
  }
}
