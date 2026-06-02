import Link from "next/link";
import { headers, cookies } from "next/headers";
import { auth, ensureAdminUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AdminUserToggle } from "@/components/admin/admin-user-toggle";
import { AdminPlanSelect } from "@/components/admin/admin-plan-select";
import { AdminUnlockForm } from "@/components/admin/admin-unlock-form";
import {
  RuntimeSettingsForm,
  type RuntimeSetting,
} from "@/components/admin/runtime-settings-form";
import { Badge } from "@/components/ui/badge";
import { fetchBackend } from "@/server/backend-api";

const ACTIVE_TASK_STATUSES = ["queued", "processing", "pending"];

function statusBadgeClass(status: string) {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "processing" || status === "queued" || status === "pending") return "bg-blue-100 text-blue-800";
  if (status === "error" || status === "failed") return "bg-red-100 text-red-800";
  if (status === "cancelled") return "bg-gray-100 text-gray-700";
  return "bg-gray-100 text-gray-700";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; table?: string; page?: string }>;
}) {
  await ensureAdminUser();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-3 text-sm text-gray-600">You need to sign in to view this page.</p>
        <Link href="/sign-in" className="mt-6 inline-block text-sm font-medium text-black underline">
          Go to sign in
        </Link>
      </main>
    );
  }

  const isAdmin = Boolean((session.user as { is_admin?: boolean }).is_admin);

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-3 text-sm text-gray-600">You are signed in, but your account is not an admin.</p>
      </main>
    );
  }

  const cookieStore = await cookies();
  const isUnlocked = cookieStore.get("admin_unlocked")?.value === "true";

  if (!isUnlocked) {
    return <AdminUnlockForm />;
  }

  const { user: selectedUserId, table: selectedTable, page: selectedPage } = await searchParams;
  const adminUserId = session.user.id;

  async function loadRuntimeSettings(): Promise<{
    settings: RuntimeSetting[];
    error: string | null;
  }> {
    try {
      const response = await fetchBackend("/admin/runtime-settings", {
        method: "GET",
        userId: adminUserId,
        cache: "no-store",
      });
      if (!response.ok) {
        return { settings: [], error: "Unable to load runtime settings." };
      }
      const payload = (await response.json()) as { settings?: RuntimeSetting[] };
      return { settings: payload.settings ?? [], error: null };
    } catch {
      return { settings: [], error: "Unable to reach the backend settings API." };
    }
  }

  const [
    runtimeSettings,
    totalUsers,
    adminUsers,
    totalTasks,
    completedTasks,
    activeTasks,
    recentUsers,
    processingNow,
    recentGenerations,
    tasksByUser,
    selectedUser,
    selectedUserTasks,
  ] = await Promise.all([
    loadRuntimeSettings(),
    prisma.user.count(),
    prisma.user.count({ where: { is_admin: true } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: "completed" } }),
    prisma.task.count({ where: { status: { in: ACTIVE_TASK_STATUSES } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        email: true,
        name: true,
        is_admin: true,
        plan: true,
        createdAt: true,
      },
    }),
    prisma.task.findMany({
      where: { status: { in: ACTIVE_TASK_STATUSES } },
      orderBy: { updated_at: "desc" },
      take: 25,
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        source: {
          select: {
            title: true,
          },
        },
      },
    }),
    prisma.task.findMany({
      orderBy: { created_at: "desc" },
      take: 40,
      select: {
        id: true,
        status: true,
        created_at: true,
        generated_clips_ids: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        source: {
          select: {
            title: true,
            type: true,
          },
        },
      },
    }),
    prisma.task.groupBy({
      by: ["user_id"],
      _count: {
        _all: true,
      },
    }),
    selectedUserId
      ? prisma.user.findUnique({
          where: { id: selectedUserId },
          select: {
            id: true,
            email: true,
            name: true,
            is_admin: true,
          },
        })
      : Promise.resolve(null),
    selectedUserId
      ? prisma.task.findMany({
          where: { user_id: selectedUserId },
          orderBy: { created_at: "desc" },
          take: 40,
          select: {
            id: true,
            status: true,
            created_at: true,
            generated_clips_ids: true,
            source: {
              select: {
                title: true,
                type: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const [
    dbUsersCount,
    dbTasksCount,
    dbSourcesCount,
    dbSessionsCount,
    dbAccountsCount,
    dbVerificationsCount,
    dbStripeWebhooksCount,
    dbAppSettingsCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.task.count(),
    prisma.source.count(),
    prisma.session.count(),
    prisma.account.count(),
    prisma.verification.count(),
    prisma.stripeWebhookEvent.count(),
    prisma.appSetting.count(),
  ]);

  const tableMapping: Record<string, { model: string; displayName: string }> = {
    users: { model: "user", displayName: "Users (Pengguna)" },
    tasks: { model: "task", displayName: "Tasks (Tugas Pemrosesan)" },
    sources: { model: "source", displayName: "Sources (Sumber Video)" },
    sessions: { model: "session", displayName: "Sessions (Sesi Login)" },
    accounts: { model: "account", displayName: "Accounts (Kredensial)" },
    verifications: { model: "verification", displayName: "Verifications" },
    stripe_webhook_events: { model: "stripeWebhookEvent", displayName: "Stripe Webhooks" },
    app_settings: { model: "appSetting", displayName: "App Settings" },
  };

  let dbRows: Record<string, unknown>[] = [];
  let dbTotalCount = 0;
  const dbPage = parseInt(selectedPage || "1", 10) || 1;
  const dbLimit = 15;
  const dbSkip = (dbPage - 1) * dbLimit;

  if (selectedTable && tableMapping[selectedTable]) {
    const { model } = tableMapping[selectedTable];
    const prismaModel = (prisma as unknown as Record<string, {
      findMany: (args: { skip: number; take: number; orderBy?: unknown }) => Promise<Record<string, unknown>[]>;
      count: () => Promise<number>;
    }>)[model];

    if (prismaModel) {
      try {
        dbRows = await prismaModel.findMany({
          skip: dbSkip,
          take: dbLimit,
          orderBy:
            selectedTable === "users" || selectedTable === "sessions" || selectedTable === "accounts" || selectedTable === "verifications"
              ? { createdAt: "desc" }
              : selectedTable === "tasks" || selectedTable === "sources" || selectedTable === "stripe_webhook_events" || selectedTable === "app_settings"
              ? { created_at: "desc" }
              : undefined,
        });
        dbTotalCount = await prismaModel.count();
      } catch (e) {
        console.error(`Error querying database table ${selectedTable}:`, e);
      }
    }
  }

  const generationCountByUser = new Map(tasksByUser.map((item) => [item.user_id, item._count._all]));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">Manage users and monitor overall platform activity.</p>
        </div>
        <Link href="/" className="text-sm font-medium text-black underline">
          Back to app
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total users</p>
          <p className="mt-2 text-2xl font-semibold text-black">{totalUsers}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Admins</p>
          <p className="mt-2 text-2xl font-semibold text-black">{adminUsers}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total tasks</p>
          <p className="mt-2 text-2xl font-semibold text-black">{totalTasks}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Completed tasks</p>
          <p className="mt-2 text-2xl font-semibold text-black">{completedTasks}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2 lg:col-span-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Currently processing</p>
          <p className="mt-2 text-2xl font-semibold text-black">{activeTasks}</p>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-medium">Runtime Settings</h2>
          <p className="text-sm text-gray-600">Configure provider keys and model settings without editing env files.</p>
        </div>
        {runtimeSettings.error ? (
          <div className="px-4 py-5 text-sm text-red-700">{runtimeSettings.error}</div>
        ) : (
          <RuntimeSettingsForm settings={runtimeSettings.settings} />
        )}
      </section>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-medium">Currently Processing Tasks</h2>
          <p className="text-sm text-gray-600">Live queue across all users.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {processingNow.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={4}>No tasks are currently processing.</td>
                </tr>
              ) : (
                processingNow.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-3">
                      <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-black underline">
                        {task.id}
                      </Link>
                      <p className="text-xs text-gray-600 truncate max-w-[420px]">{task.source?.title || "Untitled source"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{task.user.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusBadgeClass(task.status)}>{task.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{task.updated_at.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-8 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-medium">Recent Generations</h2>
          <p className="text-sm text-gray-600">Latest task activity across the platform.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Clips</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {recentGenerations.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-black underline">
                      {task.id}
                    </Link>
                    <p className="text-xs text-gray-600 truncate max-w-[420px]">{task.source?.title || "Untitled source"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{task.user.email}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusBadgeClass(task.status)}>{task.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{task.generated_clips_ids.length}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{task.created_at.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-medium">Users</h2>
          <p className="text-sm text-gray-600">Most recent users. Toggle admin access and inspect user tasks.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Generations</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {recentUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-black">{user.name || "Unnamed user"}</p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                    <Link href={`/admin?user=${user.id}`} className="text-xs text-black underline">
                      View user tasks
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <AdminPlanSelect userId={user.id} currentPlan={user.plan} />
                  </td>
                  <td className="px-4 py-3">
                    {user.is_admin ? (
                      <Badge className="bg-black text-white">Admin</Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{generationCountByUser.get(user.id) || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <AdminUserToggle
                      userId={user.id}
                      isAdmin={user.is_admin}
                      isCurrentUser={user.id === session.user.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">User Task Explorer</h2>
            <p className="text-sm text-gray-600">Inspect generations for a specific user.</p>
          </div>
          {selectedUserId && (
            <Link href="/admin" className="text-sm font-medium text-black underline">
              Clear filter
            </Link>
          )}
        </div>

        {!selectedUser ? (
          <div className="px-4 py-5 text-sm text-gray-600">Select a user from the table above to view their tasks.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200">
              Viewing: <span className="font-medium text-black">{selectedUser.name || selectedUser.email}</span> ({selectedUser.email})
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Clips</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {selectedUserTasks.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-600" colSpan={5}>No tasks found for this user.</td>
                  </tr>
                ) : (
                  selectedUserTasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-4 py-3">
                        <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-black underline">
                          {task.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{task.source?.title || "Untitled source"}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadgeClass(task.status)}>{task.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{task.generated_clips_ids.length}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{task.created_at.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Live Database Explorer Section */}
      <section className="mt-8 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Live Database Explorer</h2>
            <p className="text-sm text-gray-600">Jelajahi dan pantau tabel database langsung untuk kontrol penuh.</p>
          </div>
          {selectedTable && (
            <Link href="/admin" className="text-sm font-medium text-black underline">
              Tutup Tabel
            </Link>
          )}
        </div>

        {/* Grid of Tables */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Pilih Tabel untuk Dilihat:</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: "users", name: "Users", count: dbUsersCount },
              { key: "tasks", name: "Tasks", count: dbTasksCount },
              { key: "sources", name: "Sources", count: dbSourcesCount },
              { key: "sessions", name: "Sessions", count: dbSessionsCount },
              { key: "accounts", name: "Accounts", count: dbAccountsCount },
              { key: "verifications", name: "Verifications", count: dbVerificationsCount },
              { key: "stripe_webhook_events", name: "Stripe Webhooks", count: dbStripeWebhooksCount },
              { key: "app_settings", name: "App Settings", count: dbAppSettingsCount },
            ].map((tbl) => {
              const isActive = selectedTable === tbl.key;
              return (
                <Link
                  key={tbl.key}
                  href={`/admin?table=${tbl.key}`}
                  className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                    isActive
                      ? "bg-black border-black text-white shadow-md"
                      : "bg-white border-gray-200 text-gray-800 hover:border-gray-400"
                  }`}
                >
                  <span className="text-sm font-medium truncate">{tbl.name}</span>
                  <span className={`text-xs mt-1 ${isActive ? "text-gray-300" : "text-gray-500"}`}>
                    {tbl.count} baris
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Selected Table Data View */}
        {!selectedTable ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            Pilih salah satu tabel di atas untuk melihat isi data database secara langsung.
          </div>
        ) : (
          <div>
            <div className="px-4 py-3 bg-gray-100/50 text-sm border-b border-gray-200 flex justify-between items-center">
              <div>
                Menampilkan tabel: <span className="font-bold text-black">{tableMapping[selectedTable]?.displayName}</span>
                <span className="text-gray-500 ml-2">({dbTotalCount} total baris)</span>
              </div>
              
              {/* Pagination controls */}
              {dbTotalCount > dbLimit && (
                <div className="flex items-center gap-2">
                  {dbPage > 1 ? (
                    <Link
                      href={`/admin?table=${selectedTable}&page=${dbPage - 1}`}
                      className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50 text-gray-700"
                    >
                      Sebelumnya
                    </Link>
                  ) : (
                    <span className="px-2 py-1 text-xs border rounded text-gray-300 bg-gray-50 select-none">
                      Sebelumnya
                    </span>
                  )}
                  <span className="text-xs text-gray-600">
                    Halaman {dbPage} dari {Math.ceil(dbTotalCount / dbLimit)}
                  </span>
                  {dbPage * dbLimit < dbTotalCount ? (
                    <Link
                      href={`/admin?table=${selectedTable}&page=${dbPage + 1}`}
                      className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50 text-gray-700"
                    >
                      Berikutnya
                    </Link>
                  ) : (
                    <span className="px-2 py-1 text-xs border rounded text-gray-300 bg-gray-50 select-none">
                      Berikutnya
                    </span>
                  )}
                </div>
              )}
            </div>

            {dbRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Tabel ini kosong atau data tidak dapat dimuat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {dbRows.length > 0 &&
                        Object.keys(dbRows[0])
                          .slice(0, 5)
                          .map((colName) => (
                            <th
                              key={colName}
                              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 font-mono"
                            >
                              {colName}
                            </th>
                          ))}
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {dbRows.map((row, rowIndex) => {
                      const rowKeys = Object.keys(row);
                      return (
                        <tr key={(row["id"] as string | undefined) || rowIndex} className="hover:bg-gray-50/50">
                          {rowKeys.slice(0, 5).map((colName) => {
                            const val = row[colName];
                            let cellText = "";
                            if (val instanceof Date) {
                              cellText = val.toLocaleString();
                            } else if (typeof val === "object" && val !== null) {
                              cellText = JSON.stringify(val);
                            } else {
                              cellText = String(val ?? "-");
                            }

                            // Truncate long value
                            if (cellText.length > 55) {
                              cellText = cellText.substring(0, 52) + "...";
                            }

                            return (
                              <td
                                key={colName}
                                className="px-4 py-2 text-xs font-mono text-gray-800 break-all"
                              >
                                {cellText}
                              </td>
                            );
                          })}
                          <td className="px-4 py-2 text-right">
                            <details className="inline-block text-left">
                              <summary className="text-xs text-indigo-600 hover:text-indigo-900 cursor-pointer font-medium underline select-none">
                                Lihat JSON
                              </summary>
                              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono text-left max-w-xl overflow-x-auto whitespace-pre-wrap text-gray-800 leading-normal">
                                {JSON.stringify(row, null, 2)}
                              </div>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
