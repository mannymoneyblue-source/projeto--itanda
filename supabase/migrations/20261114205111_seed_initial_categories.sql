/*
# Seed initial categories

Adds a few starter categories so the admin has a base to work with.
These are reference data, not user data — safe to seed.
*/

INSERT INTO categories (name, slug, description) VALUES
  ('Ferramentas de Produtividade', 'ferramentas-de-produtividade', 'Aplicações e ferramentas para aumentar a produtividade'),
  ('Modelos e Templates', 'modelos-e-templates', 'Modelos editáveis para documentos, apresentações e projetos'),
  ('Cursos e Formação', 'cursos-e-formacao', 'Conteúdo educacional e materiais de formação'),
  ('Recursos Gráficos', 'recursos-graficos', 'Recursos visuais, ícones, ilustrações e elementos de design'),
  ('E-books e Guias', 'ebooks-e-guias', 'Livros digitais e guias práticos')
ON CONFLICT (slug) DO NOTHING;
