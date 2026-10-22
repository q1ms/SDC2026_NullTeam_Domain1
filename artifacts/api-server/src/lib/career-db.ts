import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { PathwayScenario } from "@workspace/api-zod";
import { JOB_ROLES, SDGS } from "./career-seed";

export type CareerProfileInput = {
  currentRole: string;
  yearsExperience: number;
  industry: string;
  skills: string[];
  interests: string[];
  weeklyHours: number;
};

export type CareerProfile = CareerProfileInput & {
  id: string;
  updatedAt: string;
};

export type JobRole = {
  id: string;
  title: string;
  description: string;
  salary: string;
  timeToReady: string;
  skills: string[];
  steps: string[];
};

export type SdgSkillMapping = {
  number: number;
  title: string;
  description: string;
  skills: string[];
};

export type StoredGeneratedPathway = {
  profileId: string;
  scenarios: unknown;
  generatedAt: string;
};

const databasePath =
  process.env.CAREER_DB_PATH ??
  resolve(process.cwd(), "data", "career-reskilling.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS career_profiles (
    id TEXT PRIMARY KEY,
    current_role TEXT NOT NULL,
    years_experience INTEGER NOT NULL CHECK (years_experience >= 0),
    industry TEXT NOT NULL,
    weekly_hours INTEGER NOT NULL CHECK (weekly_hours BETWEEN 1 AND 80),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profile_skills (
    profile_id TEXT NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    PRIMARY KEY (profile_id, skill_name)
  );

  CREATE TABLE IF NOT EXISTS profile_interests (
    profile_id TEXT NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
    interest TEXT NOT NULL,
    PRIMARY KEY (profile_id, interest)
  );

  CREATE TABLE IF NOT EXISTS generated_pathways (
    profile_id TEXT PRIMARY KEY REFERENCES career_profiles(id) ON DELETE CASCADE,
    scenarios_json TEXT NOT NULL,
    generated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS job_roles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    salary TEXT NOT NULL,
    time_to_ready TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS role_skills (
    role_id TEXT NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    skill_name TEXT NOT NULL,
    PRIMARY KEY (role_id, position),
    UNIQUE (role_id, skill_name)
  );

  CREATE TABLE IF NOT EXISTS role_learning_steps (
    role_id TEXT NOT NULL REFERENCES job_roles(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    step TEXT NOT NULL,
    PRIMARY KEY (role_id, position)
  );

  CREATE TABLE IF NOT EXISTS sdg_goals (
    number INTEGER PRIMARY KEY CHECK (number BETWEEN 1 AND 17),
    title TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sdg_skills (
    goal_number INTEGER NOT NULL REFERENCES sdg_goals(number) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    skill_name TEXT NOT NULL,
    PRIMARY KEY (goal_number, position),
    UNIQUE (goal_number, skill_name)
  );

  CREATE INDEX IF NOT EXISTS idx_profile_skills_profile
    ON profile_skills(profile_id);
  CREATE INDEX IF NOT EXISTS idx_sdg_skills_goal
    ON sdg_skills(goal_number);
`);

function seedCatalog(): void {
  database.exec("BEGIN IMMEDIATE");
  try {
    const insertRole = database.prepare(`
      INSERT OR IGNORE INTO job_roles (id, title, description, salary, time_to_ready)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertRoleSkill = database.prepare(`
      INSERT OR IGNORE INTO role_skills (role_id, position, skill_name)
      VALUES (?, ?, ?)
    `);
    const insertStep = database.prepare(`
      INSERT OR IGNORE INTO role_learning_steps (role_id, position, step)
      VALUES (?, ?, ?)
    `);
    for (const role of JOB_ROLES) {
      insertRole.run(role.id, role.title, role.description, role.salary, role.timeToReady);
      role.skills.forEach((skill, position) => insertRoleSkill.run(role.id, position, skill));
      role.steps.forEach((step, position) => insertStep.run(role.id, position, step));
    }

    const insertGoal = database.prepare(`
      INSERT OR IGNORE INTO sdg_goals (number, title, description)
      VALUES (?, ?, ?)
    `);
    const insertSdgSkill = database.prepare(`
      INSERT OR IGNORE INTO sdg_skills (goal_number, position, skill_name)
      VALUES (?, ?, ?)
    `);
    for (const goal of SDGS) {
      insertGoal.run(goal.number, goal.title, goal.description);
      goal.skills.forEach((skill, position) =>
        insertSdgSkill.run(goal.number, position, skill),
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

seedCatalog();

export function getCareerProfile(profileId: string): CareerProfile | null {
  const row = database
    .prepare(`
      SELECT id, current_role, years_experience, industry, weekly_hours, updated_at
      FROM career_profiles
      WHERE id = ?
    `)
    .get(profileId) as
    | {
        id: string;
        current_role: string;
        years_experience: number;
        industry: string;
        weekly_hours: number;
        updated_at: string;
      }
    | undefined;

  if (!row) return null;

  const skills = database
    .prepare("SELECT skill_name FROM profile_skills WHERE profile_id = ? ORDER BY skill_name")
    .all(profileId) as { skill_name: string }[];
  const interests = database
    .prepare("SELECT interest FROM profile_interests WHERE profile_id = ? ORDER BY interest")
    .all(profileId) as { interest: string }[];

  return {
    id: row.id,
    currentRole: row.current_role,
    yearsExperience: row.years_experience,
    industry: row.industry,
    weeklyHours: row.weekly_hours,
    skills: skills.map((item) => item.skill_name),
    interests: interests.map((item) => item.interest),
    updatedAt: row.updated_at,
  };
}

export function saveCareerProfile(
  profileId: string,
  profile: CareerProfileInput,
): CareerProfile {
  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(`
        INSERT INTO career_profiles (
          id, current_role, years_experience, industry, weekly_hours, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          current_role = excluded.current_role,
          years_experience = excluded.years_experience,
          industry = excluded.industry,
          weekly_hours = excluded.weekly_hours,
          updated_at = excluded.updated_at
      `)
      .run(
        profileId,
        profile.currentRole,
        profile.yearsExperience,
        profile.industry,
        profile.weeklyHours,
        now,
        now,
      );

    database.prepare("DELETE FROM profile_skills WHERE profile_id = ?").run(profileId);
    database.prepare("DELETE FROM profile_interests WHERE profile_id = ?").run(profileId);

    const insertSkill = database.prepare(
      "INSERT INTO profile_skills (profile_id, skill_name) VALUES (?, ?)",
    );
    for (const skill of new Set(profile.skills.map((item) => item.trim()).filter(Boolean))) {
      insertSkill.run(profileId, skill);
    }

    const insertInterest = database.prepare(
      "INSERT INTO profile_interests (profile_id, interest) VALUES (?, ?)",
    );
    for (const interest of new Set(profile.interests.map((item) => item.trim()).filter(Boolean))) {
      insertInterest.run(profileId, interest);
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  const saved = getCareerProfile(profileId);
  if (!saved) throw new Error("Saved career profile could not be read back.");
  return saved;
}

export function listJobRoles(): JobRole[] {
  const roles = database
    .prepare(
      "SELECT id, title, description, salary, time_to_ready FROM job_roles ORDER BY title",
    )
    .all() as {
    id: string;
    title: string;
    description: string;
    salary: string;
    time_to_ready: string;
  }[];

  const roleSkills = database.prepare(
    "SELECT skill_name FROM role_skills WHERE role_id = ? ORDER BY position",
  );
  const roleSteps = database.prepare(
    "SELECT step FROM role_learning_steps WHERE role_id = ? ORDER BY position",
  );

  return roles.map((role) => ({
    id: role.id,
    title: role.title,
    description: role.description,
    salary: role.salary,
    timeToReady: role.time_to_ready,
    skills: (roleSkills.all(role.id) as { skill_name: string }[]).map((item) => item.skill_name),
    steps: (roleSteps.all(role.id) as { step: string }[]).map((item) => item.step),
  }));
}

export function listSdgSkillMappings(): SdgSkillMapping[] {
  const goals = database
    .prepare("SELECT number, title, description FROM sdg_goals ORDER BY number")
    .all() as { number: number; title: string; description: string }[];
  const goalSkills = database.prepare(
    "SELECT skill_name FROM sdg_skills WHERE goal_number = ? ORDER BY position",
  );

  return goals.map((goal) => ({
    number: goal.number,
    title: goal.title,
    description: goal.description,
    skills: (goalSkills.all(goal.number) as { skill_name: string }[]).map(
      (item) => item.skill_name,
    ),
  }));
}

export function getGeneratedPathway(profileId: string): StoredGeneratedPathway | null {
  const row = database
    .prepare(
      "SELECT profile_id, scenarios_json, generated_at FROM generated_pathways WHERE profile_id = ?",
    )
    .get(profileId) as
    | { profile_id: string; scenarios_json: string; generated_at: string }
    | undefined;

  if (!row) return null;

  const scenarios: unknown = JSON.parse(row.scenarios_json);
  return {
    profileId: row.profile_id,
    scenarios,
    generatedAt: row.generated_at,
  };
}

export function saveGeneratedPathway(
  profileId: string,
  scenarios: PathwayScenario[],
): StoredGeneratedPathway {
  const generatedAt = new Date().toISOString();
  database
    .prepare(`
      INSERT INTO generated_pathways (profile_id, scenarios_json, generated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET
        scenarios_json = excluded.scenarios_json,
        generated_at = excluded.generated_at
    `)
    .run(profileId, JSON.stringify(scenarios), generatedAt);

  const saved = getGeneratedPathway(profileId);
  if (!saved) throw new Error("Generated pathway could not be read back.");
  return saved;
}
