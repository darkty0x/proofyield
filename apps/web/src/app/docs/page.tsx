import { redirect } from "next/navigation";
import { DEFAULT_DOC_SLUG } from "@/content/docs";

export default function DocsIndexPage() {
  redirect(`/docs/${DEFAULT_DOC_SLUG}`);
}
