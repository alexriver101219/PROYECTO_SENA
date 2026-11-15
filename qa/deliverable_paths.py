"""Nombres únicos de entrega local; las URL públicas conservan nombres estables."""

LOCAL_REPORT_NAMES = {
    'informe-tecnico-consolidado-sesha.pdf': 'informe-tecnico-consolidado-sesha-actualizado.pdf',
    'informe-seguridad-zap-vercel.pdf': 'informe-seguridad-zap-vercel-actualizado.pdf',
}
LOCAL_PRESENTATION_NAMES = {
    'SESHA-sustentacion-final.pdf': 'SESHA-sustentacion-actualizada-final.pdf',
    'SESHA-sustentacion-final.pptx': 'SESHA-sustentacion-actualizada-final.pptx',
}


def local_report_name(public_name):
    return LOCAL_REPORT_NAMES.get(public_name, public_name)
