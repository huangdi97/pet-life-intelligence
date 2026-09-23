"""v1.0 routes — Stage C consolidated layer (aggregator).

Delegates to per-domain sub-modules and re-attaches them here in the original
registration order so path precedence is unchanged. External integrations
(real vendors, payments, carriers) are EXTERNAL_BLOCKED by design: interface +
sandbox + flag only.
"""

from fastapi import APIRouter

from . import v10_platform_agent as _agent
from . import v10_platform_devices as _devices
from . import v10_platform_finance as _finance
from . import v10_platform_identity as _identity
from . import v10_platform_services as _services
from . import v10_platform_training as _training
from . import v10_platform_welfare as _welfare

router = APIRouter(tags=["v10-platform"])

# include in original endpoint order (path precedence preserved)
router.include_router(_devices.router)
router.include_router(_identity.router)
router.include_router(_welfare.router)
router.include_router(_training.router)
router.include_router(_services.router)
router.include_router(_finance.router)
router.include_router(_agent.router)

TERM_MAP = _training.TERM_MAP
