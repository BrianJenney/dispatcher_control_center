"use client";

import { useQueryClient } from "@tanstack/react-query";
import { healthQuery } from "@/app/health/health-query";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormError, FormField, SubmitButton, useActionForm } from "@/components/form";
import { useLiveQuery } from "@/components/live-query";
import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { recordHealthCheckInput, type HealthSnapshot } from "@/domain/health-check";
import { clearHealthChecks, recordHealthCheck } from "@/server/actions/health";

const timeFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function HealthPanel({ initialData }: { initialData: HealthSnapshot }) {
  const queryClient = useQueryClient();
  const { data, isError, refetch } = useLiveQuery({ ...healthQuery, initialData });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: healthQuery.queryKey });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            Database
            <Badge variant={isError ? "destructive" : "secondary"}>{isError ? "Unreachable" : "Connected"}</Badge>
          </CardTitle>
          <CardDescription>
            {data.checkCount} {data.checkCount === 1 ? "check" : "checks"} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <ErrorState description="The latest status could not load." onRetry={() => void refetch()} />
          ) : data.latestCheck ? (
            <dl className="grid gap-1 text-sm">
              <dt className="text-muted-foreground">Latest check</dt>
              <dd className="font-medium" data-testid="latest-check">
                {data.latestCheck.label}
              </dd>
              <dd className="text-muted-foreground">{timeFormat.format(new Date(data.latestCheck.recordedAt))}</dd>
            </dl>
          ) : (
            <EmptyState title="No checks yet" description="Record one below to prove the write path works." />
          )}
        </CardContent>
      </Card>
      <RecordCheckForm onRecorded={refresh} />
      <ConfirmDialog
        trigger={
          <Button variant="outline" disabled={data.checkCount === 0}>
            Clear all checks
          </Button>
        }
        title="Clear every health check?"
        description="This removes all recorded checks. It cannot be undone."
        confirmLabel="Clear checks"
        onConfirm={() => clearHealthChecks({})}
        onConfirmed={refresh}
      />
    </div>
  );
}

function RecordCheckForm({ onRecorded }: { onRecorded: () => void }) {
  const form = useActionForm({ schema: recordHealthCheckInput, action: recordHealthCheck, onSuccess: onRecorded });
  return (
    <form onSubmit={form.onSubmit} noValidate className="space-y-2">
      <FormField label="Check name" name="label" placeholder="Morning check" errors={form.fieldErrors.label} />
      <FormError message={form.formError} />
      <SubmitButton pending={form.pending}>Record check</SubmitButton>
    </form>
  );
}
