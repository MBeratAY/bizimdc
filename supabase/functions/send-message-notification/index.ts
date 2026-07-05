import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', record.user_id)
      .single();

    const senderName = senderProfile?.username ?? 'Biri';

    const { data: channel } = await supabaseAdmin
      .from('channels')
      .select('name')
      .eq('id', record.channel_id)
      .single();

    const channelName = channel?.name ?? 'bir kanal';

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('push_token')
      .neq('id', record.user_id)
      .not('push_token', 'is', null);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'Bildirim gönderilecek kullanıcı yok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = profiles.map((p) => ({
      to: p.push_token,
      sound: 'default',
      title: `#${channelName}`,
      body: `${senderName}: ${record.content}`,
      data: {
        type: 'message',
        channelId: record.channel_id,
        channelName: channelName,
      },
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    return new Response(JSON.stringify({ sent: messages.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});