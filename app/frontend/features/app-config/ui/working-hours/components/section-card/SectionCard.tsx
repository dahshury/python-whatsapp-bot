import { Card } from "@/shared/ui/card";

type SectionCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export const SectionCard = ({
  title,
  description,
  children,
}: SectionCardProps) => (
  <Card className="space-y-4 border bg-background/40 p-4">
    <div className="space-y-1">
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
    <div>{children}</div>
  </Card>
);
