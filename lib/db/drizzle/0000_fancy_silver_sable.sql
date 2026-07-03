CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"budget" integer NOT NULL,
	"deadline" text NOT NULL,
	"category" text NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT true NOT NULL,
	"bids" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"client_email" text DEFAULT '' NOT NULL,
	"accepted_bid" jsonb,
	"delivery_note" text,
	"delivery_link" text,
	"revision_note" text,
	"dispute_reason" text,
	"stripe_session_id" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"price" integer NOT NULL,
	"delivery_time" text NOT NULL,
	"cover_note" text NOT NULL,
	"builder_email" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"description" text NOT NULL,
	"price" text NOT NULL,
	"rating" text DEFAULT '5.0' NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"bg_color" text DEFAULT '#f3f4f6' NOT NULL,
	"category" text DEFAULT 'all' NOT NULL,
	"price_amount" integer,
	"billing_type" text,
	"builder_email" text,
	"sales" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tool_url" text,
	"access_instructions" text,
	"target_audience" text,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builders" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"bio" text,
	"verified" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_account_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "builders_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"tool_id" integer NOT NULL,
	"buyer_email" text,
	"session_id" text NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispute_window_ends" bigint NOT NULL,
	"status" text DEFAULT 'pending_payout' NOT NULL,
	"payout_released_at" timestamp with time zone,
	CONSTRAINT "purchases_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;