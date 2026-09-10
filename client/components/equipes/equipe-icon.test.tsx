import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EquipeIcon } from './equipe-icon';

describe('EquipeIcon', () => {
  it('renderiza o ícone com alt descritivo quando recebe o nome', () => {
    render(<EquipeIcon slug="cozinha" nome="Eq. da Cozinha" />);

    const img = screen.getByAltText('Ícone da equipe Eq. da Cozinha');
    expect(img).toHaveAttribute('src', '/equipes/cozinha.png');
  });

  it('é decorativo (aria-hidden, alt vazio) quando não recebe o nome', () => {
    const { container } = render(<EquipeIcon slug="circulos" />);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('alt', '');
  });

  it('não renderiza nada pra slug que não é de equipe', () => {
    const { container } = render(<EquipeIcon slug="equipe-inexistente" nome="?" />);

    expect(container).toBeEmptyDOMElement();
  });
});
