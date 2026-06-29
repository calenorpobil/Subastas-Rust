use anchor_lang::prelude::*;

declare_id!("7XqZiWcbGwrjeJXSKcspGrbb6SqVteKNx2Re7RyTQYyW");

#[program]
pub mod subastas {
    use super::*;

    pub fn crear_subasta(
        ctx: Context<CrearSubastaContext>,
        id: u64,
        nombre: String,
        descripcion: String,
        importe_minimo: u64,
        fecha_inicio: u64,
        fecha_fin: u64,
    ) -> Result<()> {
        // Validaciones de parámetros
        let now = Clock::get()?.unix_timestamp as u64;
        require!(fecha_inicio < fecha_fin, SubastasError::FechasInvalidas);
        require!(fecha_fin > now, SubastasError::FechaFinEnPasado);
        require!(importe_minimo > 0, SubastasError::ImporteMinimoInvalido);

        let subasta = &mut ctx.accounts.subasta;
        subasta.id = id;
        subasta.nombre = nombre;
        subasta.descripcion = descripcion;
        subasta.importe_minimo = importe_minimo;
        subasta.fecha_inicio = fecha_inicio;
        subasta.fecha_fin = fecha_fin;
        subasta.estado = 0;
        subasta.creador = *ctx.accounts.user.key;
        subasta.ganador = Pubkey::default(); // sin ganador hasta la primera puja
        subasta.importe_ganador = 0;
        Ok(())
    }

    pub fn iniciar_subasta(ctx: Context<IniciarSubastaContext>, _id: u64) -> Result<()> {
        let subasta = &mut ctx.accounts.subasta;
        require!(subasta.estado != 2, SubastasError::SubastaYaFinalizada);
        require!(subasta.estado == 0, SubastasError::SubastaYaIniciada);
        subasta.estado = 1;
        Ok(())
    }

    pub fn crear_puja(
        ctx: Context<CrearPujaContext>,
        id: u64,
        importe_puja: u64,
    ) -> Result<()> {
        let puja = &mut ctx.accounts.puja;
        let subasta = &mut ctx.accounts.subasta;

        // Tiempo actual leído de la cadena, no del cliente
        let now = Clock::get()?.unix_timestamp as u64;

        // 1. Validaciones
        require!(subasta.estado == 1, SubastasError::SubastaNoIniciada);
        require!(now < subasta.fecha_fin, SubastasError::SubastaYaFinalizada);
        require!(importe_puja >= subasta.importe_minimo, SubastasError::PujaInsuficiente);
        require!(importe_puja > subasta.importe_ganador, SubastasError::PujaNoSuperaGanadora);

        // 2. Mutaciones (la puja es la nueva ganadora, garantizado por el require! anterior)
        subasta.ganador = *ctx.accounts.user.key;
        subasta.importe_ganador = importe_puja;

        puja.id = id;
        puja.importe_puja = importe_puja;
        puja.ts = now;
        puja.pk = *ctx.accounts.user.key;
        Ok(())
    }

    pub fn finalizar_subasta(ctx: Context<FinalizarSubastaContext>, _id: u64) -> Result<()> {
        let subasta = &mut ctx.accounts.subasta;
        let now = Clock::get()?.unix_timestamp as u64;
        require!(subasta.estado == 1, SubastasError::SubastaNoIniciada);
        require!(now >= subasta.fecha_fin, SubastasError::SubastaAunNoVencida);
        subasta.estado = 2;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CrearSubastaContext<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Subasta::INIT_SPACE,
        seeds = [b"subasta", id.to_le_bytes().as_ref()],
        bump
    )]
    pub subasta: Account<'info, Subasta>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct IniciarSubastaContext<'info> {
    #[account(
        mut,
        seeds = [b"subasta", id.to_le_bytes().as_ref()],
        bump,
        constraint = subasta.creador == user.key() @ SubastasError::SoloCreadorPuedeIniciar
    )]
    pub subasta: Account<'info, Subasta>,

    pub user: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct CrearPujaContext<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Puja::INIT_SPACE,
        seeds = [b"puja", id.to_le_bytes().as_ref(), user.key().as_ref()],
        bump
    )]
    pub puja: Account<'info, Puja>,

    #[account(
        mut,
        seeds = [b"subasta", id.to_le_bytes().as_ref()],
        bump
    )]
    pub subasta: Account<'info, Subasta>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct FinalizarSubastaContext<'info> {
    #[account(
        mut,
        seeds = [b"subasta", id.to_le_bytes().as_ref()],
        bump,
        constraint = subasta.creador == user.key() @ SubastasError::SoloCreadorPuedeFinalizar
    )]
    pub subasta: Account<'info, Subasta>,

    pub user: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Subasta {
    pub id: u64,
    #[max_len(32)]
    pub nombre: String,
    #[max_len(64)]
    pub descripcion: String,
    pub importe_minimo: u64,
    pub fecha_inicio: u64,
    pub fecha_fin: u64,
    pub estado: u8, // 0=creada, 1=iniciada, 2=finalizada
    pub creador: Pubkey,
    pub ganador: Pubkey,
    pub importe_ganador: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Puja {
    pub id: u64,
    pub importe_puja: u64,
    pub ts: u64,
    pub pk: Pubkey,
}

#[error_code]
pub enum SubastasError {
    #[msg("La subasta ya ha sido iniciada")]
    SubastaYaIniciada,
    #[msg("La subasta no ha sido iniciada")]
    SubastaNoIniciada,
    #[msg("La subasta ya ha sido finalizada")]
    SubastaYaFinalizada,
    #[msg("El importe de la puja debe ser mayor o igual al importe mínimo")]
    PujaInsuficiente,
    #[msg("Solo el creador puede iniciar la subasta")]
    SoloCreadorPuedeIniciar,
    #[msg("Solo el creador puede finalizar la subasta")]
    SoloCreadorPuedeFinalizar,
    #[msg("La puja debe superar a la puja ganadora actual")]
    PujaNoSuperaGanadora,
    #[msg("La fecha de inicio debe ser anterior a la fecha de fin")]
    FechasInvalidas,
    #[msg("La fecha de fin debe ser futura")]
    FechaFinEnPasado,
    #[msg("El importe mínimo debe ser mayor que cero")]
    ImporteMinimoInvalido,
    #[msg("La subasta todavía no ha alcanzado su fecha de fin")]
    SubastaAunNoVencida,
}
