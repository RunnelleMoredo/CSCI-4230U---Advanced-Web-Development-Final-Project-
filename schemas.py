from marshmallow import Schema, fields

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    username = fields.Str(required=True)
    password = fields.Str(required=True, load_only=True)

class GoalSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    description = fields.Str(required=True)
    
class SessionSchema(Schema):
    id = fields.Int(dump_only=True)
    date = fields.DateTime(required=True)
    duration_seconds = fields.Int(required=True)
    details = fields.Dict()