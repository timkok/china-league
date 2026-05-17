import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-3xl font-bold">页面未找到</h1>
      <p className="mt-2 text-sm text-muted-foreground">您访问的内容不存在或已被移除</p>
      <Link href="/" className="mt-6 inline-block text-primary underline">
        返回首页
      </Link>
    </div>
  );
}
