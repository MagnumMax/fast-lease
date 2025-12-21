import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import {
    CheckCircle2,
    XCircle,
    Clock,
    ExternalLink,
    Activity,
    Terminal,
    Filter
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TecorDashboardPage({
    searchParams,
}: {
    searchParams: { project?: string };
}) {
    const supabase = await createClient();

    // Check authentication and admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

    if (roleData?.role !== "ADMIN") {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center">
                    <XCircle className="mx-auto h-12 w-12 text-red-500" />
                    <h1 className="mt-4 text-2xl font-bold">Access Denied</h1>
                    <p className="text-muted-foreground">Only administrators can access the Tecor Hub.</p>
                </div>
            </div>
        );
    }

    // Fetch projects for filter
    const { data: projectsData } = await supabase
        .from("tecor_test_runs")
        .select("project_name")
        .order("project_name");

    const projects = Array.from(new Set(projectsData?.map(p => p.project_name) || []));

    // Build query
    let query = supabase
        .from("tecor_test_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

    if (searchParams.project) {
        query = query.eq("project_name", searchParams.project);
    }

    const { data: runs, error } = await query;

    // Calculate metrics
    const totalRuns = runs?.length || 0;
    const successfulRuns = runs?.filter(r => r.status === "success").length || 0;
    const stability = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tecor Hub</h1>
                    <p className="text-muted-foreground">Global Quality & Infrastructure Monitoring</p>
                </div>

                <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border">
                    <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
                    <Link
                        href="/admin/tecor"
                        className={`px-3 py-1 rounded-md text-sm transition-colors ${!searchParams.project ? 'bg-background shadow-sm' : 'hover:bg-muted'}`}
                    >
                        All Projects
                    </Link>
                    {projects.map(project => (
                        <Link
                            key={project}
                            href={`/admin/tecor?project=${project}`}
                            className={`px-3 py-1 rounded-md text-sm transition-colors ${searchParams.project === project ? 'bg-background shadow-sm' : 'hover:bg-muted'}`}
                        >
                            {project}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Stability</span>
                        <Activity className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">{stability.toFixed(1)}%</span>
                        <span className="text-sm text-muted-foreground">success rate</span>
                    </div>
                    <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all ${stability > 90 ? 'bg-green-500' : stability > 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${stability}%` }}
                        />
                    </div>
                </div>

                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Runs</span>
                        <Terminal className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">{totalRuns}</span>
                        <span className="text-sm text-muted-foreground">tracked executions</span>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground italic">Last 50 runs analyzed</p>
                </div>

                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                        <div className={`w-3 h-3 rounded-full animate-pulse ${stability > 90 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold capitalize">
                            {stability > 90 ? 'Healthy' : stability > 70 ? 'Degraded' : 'Critical'}
                        </span>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground italic">Real-time system health</p>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-muted/10">
                    <h2 className="font-semibold">Execution History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted/30 text-xs font-medium text-muted-foreground uppercase">
                            <tr>
                                <th className="px-6 py-3">Project</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Triggered</th>
                                <th className="px-6 py-3">Duration</th>
                                <th className="px-6 py-3">Links</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {runs?.map((run) => (
                                <tr key={run.id} className="hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-sm text-foreground">{run.project_name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            {run.status === "success" ? (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    <span className="text-green-700 dark:text-green-400 font-medium">Passed</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                    <span className="text-red-700 dark:text-red-400 font-medium whitespace-nowrap">Failed</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        <div className="flex flex-col">
                                            <span>{run.created_at ? formatDistanceToNow(new Date(run.created_at), { addSuffix: true }) : '---'}</span>
                                            <span className="text-[10px] opacity-70">via GitHub Action</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(1)}s` : "---"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {run.deploy_url && (
                                                <a
                                                    href={run.deploy_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-700 hover:underline"
                                                >
                                                    Deployment <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                            {run.workflow_run_url && (
                                                <a
                                                    href={run.workflow_run_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700 hover:underline"
                                                >
                                                    Logs <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {(!runs || runs.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                        No execution history found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
