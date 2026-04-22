import { EmptyState, Screen } from '../../src/design-system';

export default function AdminPatientsScreen(): React.ReactElement {
  return (
    <Screen>
      <EmptyState
        title="Patient roster"
        description="List, create, and assign medications — built in Phase 3 on top of /v1/organizations/:id/patients."
      />
    </Screen>
  );
}
