import { redirect } from "next/navigation";

export default function MyListingsRedirect() {
  redirect("/dashboard/listings");
}
