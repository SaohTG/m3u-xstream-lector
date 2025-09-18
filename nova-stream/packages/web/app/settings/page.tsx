import { LinkSourceForms } from "@/components/LinkSourceForms";
import { getActivePlaylist, unlinkPlaylist } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";

export default async function SettingsPage() {
  const activePlaylist = await getActivePlaylist();

  async function handleUnlink() {
    'useserver';
    try {
        await unlinkPlaylist();
        revalidatePath('/settings');
    } catch (error) {
        console.error("Failed to unlink", error);
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Manage Playlist</CardTitle>
            <CardDescription>
              Link a new M3U or Xtream playlist, or unlink your current one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activePlaylist ? (
              <div className="space-y-4">
                <p>
                  <span className="font-semibold">Active Playlist: </span>
                  {activePlaylist.name} ({activePlaylist.type})
                </p>
                <form action={handleUnlink}>
                    <Button variant="destructive" type="submit">Unlink Playlist</Button>
                </form>
              </div>
            ) : (
              <LinkSourceForms />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
