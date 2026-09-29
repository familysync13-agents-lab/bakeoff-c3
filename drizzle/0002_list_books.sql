CREATE TABLE "list_book" (
	"id" text PRIMARY KEY NOT NULL,
	"list_id" text NOT NULL,
	"book_key" text NOT NULL,
	"title" text NOT NULL,
	"authors" text NOT NULL,
	"first_publish_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "list_book" ADD CONSTRAINT "list_book_list_id_reading_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."reading_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "list_book_listId_bookKey_idx" ON "list_book" USING btree ("list_id","book_key");