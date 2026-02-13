import fs from "fs-extra";
import path from "path";
import { ProjectConfig } from "./prompts";

/**
 * File Generator
 *
 * This handles copying the template and modifying it based on user's choices.
 */

export class Generator {
  private templatePath: string;
  private targetPath: string;
  private config: ProjectConfig;

  constructor(config: ProjectConfig, targetPath: string) {
    this.config = config;
    this.targetPath = targetPath;
    // Template is in the templates/boilerplate folder
    this.templatePath = path.join(__dirname, "..", "templates", "boilerplate");
  }

  /**
   * Generate Project
   *
   * Main function that orchestrates the entire generation process.
   */
  async generate(): Promise<void> {
    // 1. Copy all template files to target directory
    await this.copyTemplate();

    // 2. Modify files based on database choice
    await this.configureDatabase();

    // 3. Update package.json with project name
    await this.updatePackageJson();

    // 4. Remove Docker files if not needed
    if (!this.config.includeDocker) {
      await this.removeDockerFiles();
    }

    // 5. Remove .git directory from template (user will init their own)
    await this.cleanGitFiles();
  }

  /**
   * Copy Template Files
   *
   * Copies everything from templates/boilerplate to the target directory.
   */
  private async copyTemplate(): Promise<void> {
    await fs.copy(this.templatePath, this.targetPath, {
      filter: (src) => {
        // Don't copy node_modules or dist from template
        const basename = path.basename(src);
        return basename !== "node_modules" && basename !== "dist";
      },
    });
  }

  /**
   * Configure Database
   *
   * Modifies database connection files based on user's choice.
   * - MongoDB: Keep mongoose.connection.ts, remove others
   * - PostgreSQL + Prisma: Keep prisma.connection.ts, remove others
   * - PostgreSQL + Drizzle: Keep drizzle.connection.ts, remove others
   */
  /**
   * Configure Database
   */
  private async configureDatabase(): Promise<void> {
    const dbPath = path.join(this.targetPath, "src", "database");
    const indexPath = path.join(dbPath, "index.ts");

    if (this.config.database === "mongodb") {
      // Keep Mongoose, remove Prisma and Drizzle
      await fs.remove(path.join(dbPath, "prisma.connection.ts"));
      await fs.remove(path.join(dbPath, "drizzle.connection.ts"));
      await fs.remove(path.join(this.targetPath, "prisma"));
      await fs.remove(path.join(this.targetPath, "drizzle"));
      await fs.remove(path.join(this.targetPath, "drizzle.config.ts"));

      // Update index.ts to export mongoose
      await fs.writeFile(
        indexPath,
        `/**\n * Database Connection\n * \n * MongoDB with Mongoose\n */\n\nexport * from './mongoose.connection';\n`,
      );
    } else if (this.config.database === "postgresql") {
      // Remove Mongoose
      await fs.remove(path.join(dbPath, "mongoose.connection.ts"));

      if (this.config.orm === "prisma") {
        // Keep Prisma, remove Drizzle
        await fs.remove(path.join(dbPath, "drizzle.connection.ts"));
        await fs.remove(path.join(this.targetPath, "drizzle"));
        await fs.remove(path.join(this.targetPath, "drizzle.config.ts"));

        // Generate proper Prisma schema
        await this.generatePrismaSchema();

        // Update index.ts to export prisma
        await fs.writeFile(
          indexPath,
          `/**\n * Database Connection\n * \n * PostgreSQL with Prisma\n */\n\nexport * from './prisma.connection';\n`,
        );
      } else if (this.config.orm === "drizzle") {
        // Keep Drizzle, remove Prisma
        await fs.remove(path.join(dbPath, "prisma.connection.ts"));
        await fs.remove(path.join(this.targetPath, "prisma"));

        // Update index.ts to export drizzle
        await fs.writeFile(
          indexPath,
          `/**\n * Database Connection\n * \n * PostgreSQL with Drizzle\n */\n\nexport * from './drizzle.connection';\n`,
        );
      }
    }
  }

  /**
   * Generate Prisma Schema
   */
  private async generatePrismaSchema(): Promise<void> {
    const prismaDir = path.join(this.targetPath, "prisma");
    const schemaPath = path.join(prismaDir, "schema.prisma");

    const schemaContent = `// This is your Prisma schema file
     // Learn more: https://pris.ly/d/prisma-schema

     generator client {
       provider = "prisma-client-js"
     }

     datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
     }

     // Example User model
     // Uncomment and modify as needed
     // model User {
     //   id        String   @id @default(uuid())
     //   email     String   @unique
     //   name      String?
     //   password  String
     //   createdAt DateTime @default(now())
     //   updatedAt DateTime @updatedAt
     // }
    `;

    await fs.ensureDir(prismaDir);
    await fs.writeFile(schemaPath, schemaContent);
  }

  /**
   * Update package.json
   *
   * Updates the project name in package.json
   */
  private async updatePackageJson(): Promise<void> {
    const packageJsonPath = path.join(this.targetPath, "package.json");
    const packageJson = await fs.readJson(packageJsonPath);

    // Update project metadata
    packageJson.name = this.config.projectName;
    packageJson.version = "0.1.0";

    // Add database-specific scripts
    if (this.config.database === "postgresql") {
      if (this.config.orm === "prisma") {
        packageJson.scripts["db:migrate"] = "prisma migrate dev";
        packageJson.scripts["db:generate"] = "prisma generate";
        packageJson.scripts["db:studio"] = "prisma studio";
      } else if (this.config.orm === "drizzle") {
        packageJson.scripts["db:push"] = "drizzle-kit push:pg";
        packageJson.scripts["db:generate"] = "drizzle-kit generate:pg";
        packageJson.scripts["db:studio"] = "drizzle-kit studio";
      }
    }

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  /**
   * Remove Docker Files
   *
   * Removes Docker-related files if user chose not to include Docker.
   */
  private async removeDockerFiles(): Promise<void> {
    await fs.remove(path.join(this.targetPath, "Dockerfile"));
    await fs.remove(path.join(this.targetPath, "docker-compose.yml"));
    await fs.remove(path.join(this.targetPath, ".dockerignore"));
  }

  /**
   * Clean Git Files
   *
   * Removes .git directory from template so user can init their own.
   */
  private async cleanGitFiles(): Promise<void> {
    await fs.remove(path.join(this.targetPath, ".git"));
  }
}
