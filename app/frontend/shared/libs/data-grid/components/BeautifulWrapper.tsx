import type React from "react";

type Props = {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
};

export default function BeautifulWrapper({
  title,
  description,
  children,
}: Props) {
  return (
    <div className="beautiful-wrapper">
      <h1>{title}</h1>
      {description && (
        <p className="beautiful-wrapper-description">{description}</p>
      )}
      <div className="beautiful-wrapper-content">{children}</div>
    </div>
  );
}
