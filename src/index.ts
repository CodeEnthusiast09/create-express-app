import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import fs from "fs-extra";
import { promptUser } from "./prompts";
import { Generator } from "./generator";
import { Installer } from "./installer";

/**
 * Main CLI Entry Point
 *
 * This orchestrates the entire project generation process:
 * 1. Parse command-line arguments
 * 2. Ask user questions
 * 3. Generate project from template
 * 4. Install dependencies
 * 5. Initialize git
 * 6. Show success message with next steps
 */

const program = new Command();

program
  .name("create-express-app")
  .description("Generate a production-ready Express TypeScript project")
  .version("1.0.0")
  .argument("[project-name]", "Name of the project")
  .action(async (projectName?: string) => {
    try {
      // Show welcome message
      console.log();
      console.log(chalk.bold.blue("🚀 Create Express App"));
      console.log();

      // 1. Get user choices
      const config = await promptUser(projectName);

      // 2. Determine target path
      const targetPath = path.join(process.cwd(), config.projectName);

      // Check if directory already exists
      if (await fs.pathExists(targetPath)) {
        console.log();
        console.log(
          chalk.red(`❌ Directory "${config.projectName}" already exists!`),
        );
        console.log();
        process.exit(1);
      }

      // 3. Generate project
      console.log();
      console.log(chalk.cyan("📁 Creating project structure..."));
      const generator = new Generator(config, targetPath);
      await generator.generate();
      console.log(chalk.green("✓ Project structure created"));

      // 4. Install dependencies
      console.log();
      const installer = new Installer(config, targetPath);
      await installer.installDependencies();

      // 5. Initialize git
      console.log();
      await installer.initGit();

      // 6. Show success message
      showSuccessMessage(config);
    } catch (error) {
      console.log();
      console.log(chalk.red("❌ Error:"), error);
      console.log();
      process.exit(1);
    }
  });

/**
 * Show Success Message
 *
 * Displays next steps for the user.
 */
function showSuccessMessage(config: any): void {
  console.log();
  console.log(chalk.green.bold("🎉 Success! Your project is ready!"));
  console.log();
  console.log(chalk.cyan("📋 Next steps:"));
  console.log();
  console.log(chalk.white(`  cd ${config.projectName}`));
  console.log(chalk.white("  cp .env.example .env"));
  console.log(chalk.gray("  # Edit .env with your database connection"));
  console.log();

  // Database-specific instructions
  if (config.database === "mongodb") {
    console.log(chalk.yellow("  # Make sure MongoDB is running"));
  } else if (config.database === "postgresql") {
    console.log(chalk.yellow("  # Make sure PostgreSQL is running"));
    if (config.orm === "prisma") {
      console.log(chalk.gray("  # Prisma Client already generated ✓"));
      console.log(chalk.white("  npx prisma migrate dev"));
      console.log(chalk.gray("  # Run this to create your database tables"));
    } else if (config.orm === "drizzle") {
      console.log(chalk.white("  npx drizzle-kit generate:pg"));
      console.log(chalk.white("  npx drizzle-kit push:pg"));
    }
  }

  console.log();
  console.log(chalk.white("  npm run dev"));
  console.log();
  console.log(chalk.gray("  Server will start at http://localhost:3000"));
  console.log();
  console.log(chalk.cyan("📚 Documentation: Check README.md"));
  console.log();
  console.log(chalk.green("Happy coding! 🚀"));
  console.log();
}

// Run the program
program.parse(process.argv);
