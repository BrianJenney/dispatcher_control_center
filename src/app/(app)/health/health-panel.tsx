"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormError, FormField, SubmitButton, useActionForm } from "@/components/form";
import { useFormat } from "@/components/format";
import { useLiveQuery } from "@/components/live-query";
import { liveQueries } from "@/components/queries";
import { EmptyState, ErrorState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { recordHealthCheckInput, type HealthSnapshot } from "@/domain/health-check";
import { clearHealthChecks, recordHealthCheck } from "@/server/actions/health";

export function HealthPanel({ initialData }: { initialData: HealthSnapshot }) {
  const queryClient = useQueryClient();
  const format = useFormat();
  const { data, isError, refetch } = useLiveQuery(liveQueries.health, initialData);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: liveQueries.health.queryKey });
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
              <dd className="text-muted-foreground">{format.shortDay(data.latestCheck.recordedAt)}, {format.time(data.latestCheck.recordedAt)}</dd>
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
