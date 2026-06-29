import { db } from "@workspace/db";
import { jobsTable, toolsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const JOBS = [
  { title: "Build a lead qualification chatbot for my real estate agency", budget: 280, deadline: "3 days", bids: 7, category: "agent", urgent: true, isNew: false, description: "I need a chatbot that asks leads a series of qualification questions (budget, timeline, location preference) and scores them 1–10. Should integrate with my CRM via webhook. Built with Claude API preferred.", skills: ["Claude API", "JavaScript", "Chatbot"] },
  { title: "Scrape 500 B2B company emails from LinkedIn + enrich with AI", budget: 120, deadline: "24 hours", bids: 12, category: "data", urgent: true, isNew: false, description: "Need a Python script that scrapes company data from LinkedIn Sales Navigator (I'll provide my credentials/cookies) and uses AI to guess and verify the decision-maker emails. Output as CSV.", skills: ["Python", "Web scraping", "Data analysis"] },
  { title: "AI-powered invoice parser — PDF to structured JSON", budget: 350, deadline: "1 week", bids: 4, category: "automation", urgent: false, isNew: true, description: "I receive hundreds of invoices as PDFs monthly. Need a tool that extracts vendor name, date, line items, totals, and tax into clean JSON. Must handle varied PDF layouts. API or web UI preferred.", skills: ["Python", "Claude API", "Automation"] },
  { title: "Replit app: auto-post Twitter/X threads from a Google Sheet", budget: 90, deadline: "3 days", bids: 9, category: "automation", urgent: false, isNew: true, description: "Simple tool: reads rows from a Google Sheet (each row = one thread), schedules and posts to Twitter/X via API at times I specify. Should handle images in a separate column.", skills: ["Replit", "JavaScript", "Automation"] },
  { title: "Build a landing page with AI-generated copy for my SaaS", budget: 200, deadline: "1 week", bids: 6, category: "web", urgent: false, isNew: false, description: "Need a clean, converting landing page. The AI should auto-generate headline variations and body copy based on my product description. Built in HTML/CSS or React, deployed on Vercel.", skills: ["JavaScript", "Claude API", "No-code"] },
  { title: "Customer support AI agent — integrates with Intercom", budget: 500, deadline: "2 weeks", bids: 3, category: "agent", urgent: false, isNew: true, description: "Build an AI agent that handles tier-1 support tickets in Intercom. Should answer FAQs, escalate complex issues to humans, and log resolutions. Must be trained on our help docs.", skills: ["Claude API", "Python", "Chatbot", "Automation"] },
  { title: "Python script: monitor Amazon prices and alert me via Telegram", budget: 75, deadline: "24 hours", bids: 15, category: "automation", urgent: true, isNew: false, description: "Simple price tracker. Give it a list of Amazon product URLs, check prices every hour, send me a Telegram message when price drops below a threshold I set per product.", skills: ["Python", "Automation"] },
  { title: "AI dashboard that summarises my weekly Notion notes", budget: 160, deadline: "1 week", bids: 5, category: "data", urgent: false, isNew: true, description: "Pull notes from my Notion workspace via API, summarise them weekly using Claude, and display in a clean read-only dashboard (web app). Should highlight action items and decisions.", skills: ["Claude API", "Python", "Replit"] },
];

const TOOLS = [
  { name: "ColdMailGPT", emoji: "✉️", description: "Generates personalised cold email sequences from a LinkedIn URL. Output: 5-email drip, subject lines, follow-ups.", price: "$29/mo", rating: "4.8", reviews: 34, bgColor: "#e8f4fd", category: "all" },
  { name: "InvoiceAI", emoji: "📄", description: "Drag-drop PDF invoices → structured JSON or CSV. Handles 50+ layouts. Webhook output supported.", price: "$19/mo", rating: "4.9", reviews: 61, bgColor: "#f0fdf4", category: "all" },
  { name: "LeadScorer", emoji: "🎯", description: "Embed on any site. Asks 6 questions, scores leads 1–10, sends scored leads to your CRM via webhook.", price: "$49/mo", rating: "4.7", reviews: 22, bgColor: "#fdf4ff", category: "all" },
  { name: "SheetBot", emoji: "📊", description: "Connect to Google Sheets, ask questions in plain English. Generates charts and summaries instantly.", price: "$15/mo", rating: "4.6", reviews: 45, bgColor: "#fffbeb", category: "all" },
  { name: "SupportGenie", emoji: "🤖", description: "Paste your help docs, get an embeddable support widget. Answers Tier 1 questions, escalates the rest.", price: "$39/mo", rating: "4.8", reviews: 18, bgColor: "#fef2f2", category: "all" },
  { name: "SEO Autopilot", emoji: "🔍", description: "Give it a keyword, get a full SEO-optimised blog post with internal link suggestions and meta tags.", price: "$25/mo", rating: "4.5", reviews: 77, bgColor: "#f0fdf4", category: "all" },
];

async function seed() {
  console.log("Seeding database…");

  const existingJobs = await db.select().from(jobsTable).limit(1);
  if (existingJobs.length === 0) {
    await db.insert(jobsTable).values(JOBS);
    console.log(`Inserted ${JOBS.length} jobs`);
  } else {
    console.log("Jobs already seeded, skipping");
  }

  const existingTools = await db.select().from(toolsTable).limit(1);
  if (existingTools.length === 0) {
    await db.insert(toolsTable).values(TOOLS);
    console.log(`Inserted ${TOOLS.length} tools`);
  } else {
    console.log("Tools already seeded, skipping");
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
