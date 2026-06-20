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

    // 2.5 Uncomment the right DATABASE_URL line in .env.example
    await this.updateEnvExample();

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
    const drizzleDir = path.join(this.targetPath, "drizzle");
    // drizzle-kit looks for its config at the project root by default
    const drizzleConfigPath = path.join(this.targetPath, "drizzle.config.ts");
    const drizzleSqliteConfigPath = path.join(this.targetPath, "drizzle.config.sqlite.ts");

    if (this.config.database === "mongodb") {
      // Keep Mongoose, remove Prisma and Drizzle
      await fs.remove(path.join(dbPath, "prisma.connection.ts"));
      await fs.remove(path.join(dbPath, "drizzle.connection.ts"));
      await fs.remove(path.join(dbPath, "drizzle.sqlite.connection.ts"));
      await fs.remove(path.join(this.targetPath, "prisma"));
      await fs.remove(drizzleDir);
      await fs.remove(drizzleConfigPath);
      await fs.remove(drizzleSqliteConfigPath);

      // Update index.ts to export mongoose
      await fs.writeFile(
        indexPath,
        `/**\n * Database Connection\n * \n * MongoDB with Mongoose\n */\n\nexport * from './mongoose.connection';\n`,
      );
    } else if (this.config.database === "postgresql") {
      // Remove Mongoose and the SQLite Drizzle variant
      await fs.remove(path.join(dbPath, "mongoose.connection.ts"));
      await fs.remove(path.join(dbPath, "drizzle.sqlite.connection.ts"));
      await fs.remove(path.join(drizzleDir, "schema.sqlite.ts"));
      await fs.remove(drizzleSqliteConfigPath);

      if (this.config.orm === "prisma") {
        // Keep Prisma, remove Drizzle
        await fs.remove(path.join(dbPath, "drizzle.connection.ts"));
        await fs.remove(drizzleDir);
        await fs.remove(drizzleConfigPath);

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
    } else if (this.config.database === "sqlite") {
      // Keep Drizzle (SQLite variant), remove Mongoose, Prisma, and Postgres Drizzle
      await fs.remove(path.join(dbPath, "mongoose.connection.ts"));
      await fs.remove(path.join(dbPath, "prisma.connection.ts"));
      await fs.remove(path.join(this.targetPath, "prisma"));
      await fs.remove(path.join(dbPath, "drizzle.connection.ts"));
      await fs.move(
        path.join(dbPath, "drizzle.sqlite.connection.ts"),
        path.join(dbPath, "drizzle.connection.ts"),
      );

      // Swap in the SQLite schema and drizzle-kit config
      await fs.remove(path.join(drizzleDir, "schema.ts"));
      await fs.move(
        path.join(drizzleDir, "schema.sqlite.ts"),
        path.join(drizzleDir, "schema.ts"),
      );
      await fs.remove(drizzleConfigPath);
      await fs.move(drizzleSqliteConfigPath, drizzleConfigPath);

      // Update index.ts to export drizzle
      await fs.writeFile(
        indexPath,
        `/**\n * Database Connection\n * \n * SQLite with Drizzle\n */\n\nexport * from './drizzle.connection';\n`,
      );
    }
  }

  /**
   * Update .env.example
   *
   * Uncomments the DATABASE_URL line matching the chosen database
   * and comments out the other two.
   */
  private async updateEnvExample(): Promise<void> {
    const envExamplePath = path.join(this.targetPath, ".env.example");
    let content = await fs.readFile(envExamplePath, "utf-8");

    const dbLines: Record<ProjectConfig["database"], string> = {
      mongodb: "DATABASE_URL=mongodb://localhost:27017/myapp",
      postgresql: "DATABASE_URL=postgresql://user:password@localhost:5432/myapp",
      sqlite: "DATABASE_URL=./dev.db",
    };

    // Comment out every DATABASE_URL line, then uncomment the chosen one
    content = content.replace(/^#?\s*(DATABASE_URL=.*)$/gm, "# $1");
    content = content.replace(`# ${dbLines[this.config.database]}`, dbLines[this.config.database]);

    await fs.writeFile(envExamplePath, content);
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
        packageJson.scripts["db:push"] = "drizzle-kit push";
        packageJson.scripts["db:generate"] = "drizzle-kit generate";
        packageJson.scripts["db:studio"] = "drizzle-kit studio";
      }
    } else if (this.config.database === "sqlite") {
      packageJson.scripts["db:push"] = "drizzle-kit push";
      packageJson.scripts["db:generate"] = "drizzle-kit generate";
      packageJson.scripts["db:studio"] = "drizzle-kit studio";
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
    await fs.remove(path.join(this.targetPath, ".env.docker"));
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
