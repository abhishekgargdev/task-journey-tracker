import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <Card className="max-w-lg mx-auto text-center shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Page not found</CardTitle>
        <CardDescription>
          The page you are looking for does not exist or may have been moved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button render={<Link href="/" />} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
