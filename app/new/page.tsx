'use client';

import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadForm } from '@/components/episodes/upload-form';
import { FeedForm } from '@/components/episodes/feed-form';
import { toast } from '@/hooks/use-toast';

export default function NewTaskPage() {
  const router = useRouter();

  const handleUploadSuccess = (episodeId: string) => {
    toast({
      title: '上傳成功！',
      description: '音檔已上傳，正在背景處理中，請在 Dashboard 查看進度。',
    });
    router.push('/');
  };

  const handleFeedSuccess = (episodeIds: string[]) => {
    toast({
      title: `已建立 ${episodeIds.length} 集任務`,
      description: '集數已加入處理佇列，請在歷史記錄查看進度。',
    });
    router.push('/history');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">新增任務</h1>
        <p className="text-sm text-muted-foreground mt-1">
          上傳音檔或輸入 RSS Feed 網址來處理 Podcast 內容。
        </p>
      </div>

      <Tabs defaultValue="upload">
        <TabsList className="mb-6">
          <TabsTrigger value="upload">上傳音檔</TabsTrigger>
          <TabsTrigger value="rss">RSS Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <UploadForm onSuccess={handleUploadSuccess} />
        </TabsContent>

        <TabsContent value="rss">
          <FeedForm onSuccess={handleFeedSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
