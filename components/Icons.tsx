import type { SVGProps } from "react";
type Props = SVGProps<SVGSVGElement>;
function Icon({ children, ...props }: Props) { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>; }
export function ArrowRight(props: Props) { return <Icon {...props}><path d="M5 12h14m-6-6 6 6-6 6" /></Icon>; }
export function BookOpen(props: Props) { return <Icon {...props}><path d="M12 5v15m0-15C8 2 3 4 3 4v14s5-2 9 2c4-4 9-2 9-2V4s-5-2-9 1Z" /></Icon>; }
export function Layers(props: Props) { return <Icon {...props}><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></Icon>; }
export function CheckCircle(props: Props) { return <Icon {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6" /></Icon>; }
export function Clock(props: Props) { return <Icon {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" /></Icon>; }
export function Bookmark(props: Props) { return <Icon {...props}><path d="M6 4h12v17l-6-4-6 4V4Z" /></Icon>; }
export function Shield(props: Props) { return <Icon {...props}><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6" /></Icon>; }
export function ArrowUpRight(props: Props) { return <Icon {...props}><path d="M6 18 18 6M6 6h12v12" /></Icon>; }
export function Asterisk(props: Props) { return <Icon {...props}><path d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5" /></Icon>; }
export function CornerArrow(props: Props) { return <Icon {...props}><path d="M5 3v9a4 4 0 0 0 4 4h10m-5-5 5 5-5 5" /></Icon>; }
