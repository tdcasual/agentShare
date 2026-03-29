from app.config import Settings
from app.factory import create_app
from app.runtime import build_runtime

settings = Settings()
runtime = build_runtime(settings)
app = create_app(settings, runtime=runtime)
