-- =====================================================
-- AI CHAT HISTORY - Lưu lịch sử trò chuyện với AI
-- =====================================================
-- Created: 2025-12-10
-- Purpose: Store conversation history for CEO AI Assistant
-- Features:
--   - Save all chat messages (user + AI)
--   - Attach insights to messages
--   - Session management
--   - Auto-cleanup old messages

-- =====================================================
-- 1. CREATE TABLE: ai_chat_history
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Message data
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Metadata
  insights JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store metrics, confidence, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- =====================================================
-- 2. INDEXES for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_chat_history_company 
  ON ai_chat_history(company_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_user 
  ON ai_chat_history(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_session 
  ON ai_chat_history(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_created 
  ON ai_chat_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_history_role 
  ON ai_chat_history(role);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_chat_history_company_session 
  ON ai_chat_history(company_id, session_id, created_at DESC);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own chat history
CREATE POLICY "Users can view own chat history"
  ON ai_chat_history
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- Policy: Users can insert their own messages
CREATE POLICY "Users can insert own messages"
  ON ai_chat_history
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Policy: Users can update their own messages (soft delete)
CREATE POLICY "Users can update own messages"
  ON ai_chat_history
  FOR UPDATE
  USING (
    auth.uid() = user_id
  );

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_history_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update timestamp on record update
DROP TRIGGER IF EXISTS trigger_update_chat_history_timestamp ON ai_chat_history;
CREATE TRIGGER trigger_update_chat_history_timestamp
  BEFORE UPDATE ON ai_chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_history_timestamp();

-- Function: Get chat history for a session
CREATE OR REPLACE FUNCTION get_chat_session(
  p_session_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  insights JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.role,
    h.content,
    h.insights,
    h.metadata,
    h.created_at
  FROM ai_chat_history h
  WHERE h.session_id = p_session_id
    AND h.deleted_at IS NULL
  ORDER BY h.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get recent chat sessions
CREATE OR REPLACE FUNCTION get_recent_chat_sessions(
  p_user_id UUID,
  p_company_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  session_id UUID,
  last_message TEXT,
  message_count BIGINT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.session_id,
    (SELECT content 
     FROM ai_chat_history 
     WHERE session_id = h.session_id 
       AND deleted_at IS NULL 
     ORDER BY created_at DESC 
     LIMIT 1) as last_message,
    COUNT(*) as message_count,
    MAX(h.created_at) as last_activity
  FROM ai_chat_history h
  WHERE h.user_id = p_user_id
    AND h.company_id = p_company_id
    AND h.deleted_at IS NULL
  GROUP BY h.session_id
  ORDER BY MAX(h.created_at) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-cleanup old chat history (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_chat_history()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM ai_chat_history
    WHERE created_at < now() - INTERVAL '90 days'
      AND deleted_at IS NULL
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. SAMPLE DATA (for testing)
-- =====================================================

-- Get first CEO user and company
DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_session_id UUID := gen_random_uuid();
BEGIN
  -- Get first CEO user
  SELECT id INTO v_user_id
  FROM auth.users
  LIMIT 1;
  
  -- Get their company
  SELECT id INTO v_company_id
  FROM companies
  WHERE created_by = v_user_id
  LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_company_id IS NOT NULL THEN
    -- Insert sample conversation
    INSERT INTO ai_chat_history (company_id, user_id, session_id, role, content, metadata)
    VALUES
      (v_company_id, v_user_id, v_session_id, 'user', 
       'Tình hình công ty thế nào?', 
       '{"timestamp": "2025-12-10T10:00:00Z"}'::jsonb),
      
      (v_company_id, v_user_id, v_session_id, 'assistant', 
       'Dựa trên phân tích dữ liệu, công ty đang hoạt động tốt với doanh thu 16.37B VND trong 90 ngày, lợi nhuận 8.23B VND (tỷ suất 50.3%). Có 12 nhân viên đang làm việc hiệu quả.', 
       '{"confidence": 0.92, "metrics_analyzed": 5}'::jsonb),
      
      (v_company_id, v_user_id, v_session_id, 'user', 
       'Có rủi ro nào cần lưu ý không?', 
       '{"timestamp": "2025-12-10T10:01:00Z"}'::jsonb),
      
      (v_company_id, v_user_id, v_session_id, 'assistant', 
       'Hiện tại có 2 cảnh báo: (1) Có 3 nhân viên có khối lượng công việc cao (>5 tasks), nguy cơ burnout. (2) Có 8 tasks quá hạn cần xử lý ngay. Tôi khuyên nên phân bổ lại công việc và tăng deadline cho các task quan trọng.', 
       '{"confidence": 0.88, "risks_found": 2}'::jsonb);
    
    RAISE NOTICE 'Sample chat history created for session: %', v_session_id;
  END IF;
END $$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

-- Count chat messages
SELECT COUNT(*) as total_messages 
FROM ai_chat_history 
WHERE deleted_at IS NULL;

-- Show recent sessions
SELECT 
  session_id,
  COUNT(*) as message_count,
  MIN(created_at) as session_start,
  MAX(created_at) as session_end
FROM ai_chat_history
WHERE deleted_at IS NULL
GROUP BY session_id
ORDER BY MAX(created_at) DESC;

-- Migration complete
-- ✅ AI Chat History schema created successfully!
