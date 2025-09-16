
'use client';

import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

interface ProjectCardProps {
  id: string;
  name: string;
  tags: string[];
  onClick: () => void;
}

export function ProjectCard({ name, tags, onClick }: ProjectCardProps) {
  return (
    <Card
      className="cursor-pointer rounded-xl border border-border bg-card transition-all hover:shadow-md hover:border-foreground/20"
      onClick={onClick}
    >
      <div className="flex items-center p-4">
        <div className="flex-1">
          <CardHeader className="p-0">
            <CardTitle className="text-lg font-bold">{name}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="font-normal">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && <Badge variant="outline">+{tags.length - 3} more</Badge>}
            </div>
          </CardContent>
        </div>
        <ChevronRight className="h-6 w-6 text-muted-foreground" />
      </div>
    </Card>
  );
}
