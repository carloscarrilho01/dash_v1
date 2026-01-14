-- Adiciona a coluna 'status' na tabela 'leads' se não existir
-- Execute este SQL no Supabase SQL Editor

-- Verifica e adiciona a coluna status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'leads'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'novo';

        -- Adiciona um comentário explicando os valores possíveis
        COMMENT ON COLUMN leads.status IS 'Status do lead no funil de vendas: novo, contato, negociacao, convertido, perdido';

        RAISE NOTICE 'Coluna status adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna status já existe.';
    END IF;
END $$;

-- Cria um índice para melhorar performance nas consultas por status
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Atualiza leads existentes que não tem status definido
UPDATE leads
SET status = 'novo'
WHERE status IS NULL;
