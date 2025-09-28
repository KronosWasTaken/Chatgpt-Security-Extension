from fastapi import APIRouter



router=APIRouter()


@router.get("/")
def get_msps():
    return {"ig":"works"}